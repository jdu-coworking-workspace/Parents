export interface StudentUser {
    id: number;
    email: string;
    phone_number: string;
    given_name: string;
    family_name: string;
}

export interface PasswordState {
    has_password: boolean;
    cognito_status: string;
}
