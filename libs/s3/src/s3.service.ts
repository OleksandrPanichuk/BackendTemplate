import { Env } from '@/shared/config';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
  IDeleteResult,
  IFileExistsResult,
  IFileValidationOptions,
  IUploadOptions,
  IUploadResult,
} from './s3.interfaces';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly logger: Logger = new Logger(S3Service.name);
  private readonly bucket: string;
  private readonly region: string;
  private readonly maxRetries: number = 3;
  private readonly defaultMaxFileSize: number = 10 * 1024 * 1024;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>(Env.AWS_S3_BUCKET)!;
    this.region = this.config.get<string>(Env.AWS_REGION)!;

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.get<string>(Env.AWS_ACCESS_KEY_ID)!,
        secretAccessKey: this.config.get<string>(Env.AWS_SECRET_ACCESS_KEY)!,
      },

      maxAttempts: this.maxRetries,
    });

    this.logger.log(
      `StorageService initialized for bucket: ${this.bucket} in region: ${this.region}`,
    );
  }

  public getClient(): S3Client {
    return this.client;
  }

  public async uploadFile(
    file: Express.Multer.File,
    options: IUploadOptions = {},
  ): Promise<IUploadResult> {
    try {
      this.validateFile(file, {
        maxSize: options.maxSize,
        allowedMimeTypes: options.allowedMimeTypes,
      });

      const key = this.generateKey(file.originalname, options);
      const contentType = options.contentType || file.mimetype;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
        ACL: options.acl || 'private',
        Metadata: options.metadata,
        CacheControl: options.cacheControl,
      });

      const result = await this.executeWithRetry(() =>
        this.client.send(command),
      );

      const url = this.getPublicUrl(key);

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url,
        bucket: this.bucket,
        size: file.size,
        mimetype: contentType,
        etag: result.ETag,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);

      throw new InternalServerErrorException('Failed to upload file to S3');
    }
  }

  public async uploadFiles(
    files: Express.Multer.File[],
    options: IUploadOptions = {},
  ): Promise<IUploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  public async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string,
    options: IUploadOptions = {},
  ): Promise<IUploadResult> {
    try {
      const maxSize = options.maxSize || this.defaultMaxFileSize;
      if (buffer.length > maxSize) {
        throw new BadRequestException(
          `Buffer size exceeds maximum allowed size of ${maxSize} bytes`,
        );
      }

      const key = this.generateKey(filename, options);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: options.acl || 'private',
        Metadata: options.metadata,
        CacheControl: options.cacheControl,
      });

      const result = await this.executeWithRetry(() =>
        this.client.send(command),
      );

      const url = this.getPublicUrl(key);

      this.logger.log(`Buffer uploaded successfully: ${key}`);

      return {
        key,
        url,
        bucket: this.bucket,
        size: buffer.length,
        mimetype: contentType,
        etag: result.ETag,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload buffer: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to upload buffer to S3');
    }
  }

  public async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.executeWithRetry(() => this.client.send(command));
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete file from S3');
    }
  }

  public async deleteFiles(keys: string[]): Promise<IDeleteResult[]> {
    const results = await Promise.allSettled(
      keys.map(async (key) => {
        try {
          await this.deleteFile(key);
          return { key, success: true };
        } catch (error) {
          return { key, success: false, error: error.message };
        }
      }),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        key: keys[index],
        success: false,
        error: result.reason?.message || 'Unknown error',
      };
    });
  }

  public async createPresignedUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });

      const url = await getSignedUrl(this.client, command, { expiresIn });

      this.logger.log(`Presigned URL created successfully for key: ${key}`);

      return url;
    } catch (error) {
      this.logger.error(
        `Failed to create presigned URL: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create presigned URL');
    }
  }

  public async fileExists(key: string): Promise<IFileExistsResult> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const result = await this.client.send(command);

      return {
        exists: true,
        size: result.ContentLength,
        lastModified: result.LastModified,
        contentType: result.ContentType,
      };
    } catch (error) {
      if (
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return { exists: false };
      }

      this.logger.error(
        `Failed to check file existence: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to check file existence');
    }
  }

  public async getFileStream(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const result = await this.client.send(command);

      if (!result.Body) {
        throw new Error('No body in response');
      }

      return result.Body as Readable;
    } catch (error) {
      this.logger.error(
        `Failed to get file stream: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to get file stream');
    }
  }

  public async uploadStream(
    stream: Readable,
    key: string,
    contentType: string,
    options: IUploadOptions = {},
  ): Promise<IUploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: stream,
        ContentType: contentType,
        ACL: options.acl || 'private',
        Metadata: options.metadata,
        CacheControl: options.cacheControl,
      });

      const result = await this.executeWithRetry(() =>
        this.client.send(command),
      );

      const url = this.getPublicUrl(key);

      this.logger.log(`Stream uploaded successfully: ${key}`);

      return {
        key,
        url,
        bucket: this.bucket,
        size: 0,
        mimetype: contentType,
        etag: result.ETag,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload stream: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to upload stream to S3');
    }
  }

  public async copyFile(
    sourceKey: string,
    destinationKey: string,
    options: Partial<IUploadOptions> = {},
  ): Promise<IUploadResult> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        CopySource: `${this.bucket}/${sourceKey}`,
        ACL: options.acl || 'private',
        Metadata: options.metadata,
        MetadataDirective: options.metadata ? 'REPLACE' : 'COPY',
        CacheControl: options.cacheControl,
      });

      const result = await this.executeWithRetry(() =>
        this.client.send(command),
      );

      const url = this.getPublicUrl(destinationKey);

      this.logger.log(
        `File copied successfully: ${sourceKey} -> ${destinationKey}`,
      );

      return {
        key: destinationKey,
        url,
        bucket: this.bucket,
        size: 0,
        mimetype: '',
        etag: result.CopyObjectResult?.ETag,
      };
    } catch (error) {
      this.logger.error(`Failed to copy file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to copy file in S3');
    }
  }

  private validateFile(
    file: Express.Multer.File,
    options: IFileValidationOptions,
  ): void {
    const maxSize = options.maxSize || this.defaultMaxFileSize;

    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
      );
    }

    if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File type ${file.mimetype} is not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`,
        );
      }
    }

    if (options.allowedExtensions && options.allowedExtensions.length > 0) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!options.allowedExtensions.includes(ext)) {
        throw new BadRequestException(
          `File extension ${ext} is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`,
        );
      }
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (
          error.$metadata?.httpStatusCode >= 400 &&
          error.$metadata?.httpStatusCode < 500
        ) {
          throw error;
        }

        if (attempt < retries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `Operation failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${retries})`,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateKey(originalname: string, options: IUploadOptions): string {
    const ext = path.extname(originalname);
    const filename = options.filename || `${uuidv4()}${ext}`;
    const folder = options.folder ? `${options.folder}/` : '';
    return `${folder}${filename}`;
  }

  private getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  public async healthCheck(): Promise<void> {
    try {
      const command = new HeadBucketCommand({ Bucket: this.bucket });
      await this.client.send(command);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown S3 error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`S3 health check failed: ${message}`, stack);
      throw error;
    }
  }
}
