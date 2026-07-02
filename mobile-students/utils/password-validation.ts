export type PasswordRuleKey =
  | "minLength"
  | "hasNumber"
  | "hasUppercase"
  | "hasLowercase"
  | "hasSpecialChar";

export type PasswordRule = {
  key: PasswordRuleKey;
  passed: boolean;
};

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    { key: "minLength", passed: password.length >= 8 },
    { key: "hasNumber", passed: /\d/.test(password) },
    { key: "hasUppercase", passed: /[A-Z]/.test(password) },
    { key: "hasLowercase", passed: /[a-z]/.test(password) },
    {
      key: "hasSpecialChar",
      passed: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/;'`~]/.test(password),
    },
  ];
}

export function validatePassword(password: string): boolean {
  return getPasswordRules(password).every((rule) => rule.passed);
}
