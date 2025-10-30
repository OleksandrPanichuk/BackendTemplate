import { IsRequiredString } from "@/shared/decorators";
import { ApiProperty } from "@nestjs/swagger";


export class VerifyEmailInput {
    @ApiProperty({
        description: 'Verification code sent to email',
        example: '123456',
        maxLength: 6,
        minLength: 6
    })
    @IsRequiredString(6,6)
    readonly code: string
}