"use server";

import { signIn } from "@/auth";

export const login = async (
  email: string,
  password: string,
  newPassword: string
) => {
  try {
    const response = await signIn("credentials", {
      email,
      password,
      newPassword,
      redirect: false,
    });

    if (typeof response === "string") {
      try {
        const url = new URL(response, "http://localhost:3000");
        const errorCode = url.searchParams.get("code");
        const errorParam = url.searchParams.get("error");

        if (errorCode === "OTPError" || errorParam === "OTPError") {
          return { error: "OTPError", message: "OTP required" };
        }
        if (
          errorCode === "InvalidCredentialsError" ||
          errorParam === "InvalidCredentialsError" ||
          errorParam === "CredentialsSignin"
        ) {
          return {
            error: "InvalidCredentialsError",
            message: "Invalid credentials",
          };
        }
        if (errorParam) {
          return { error: errorParam, message: errorParam };
        }
      } catch {
        // Ignored
      }
    }

    return response;
  } catch (error: any) {
    // Check if error is an internal Next.js redirect
    if (
      error?.message === "NEXT_REDIRECT" ||
      (typeof error?.digest === "string" &&
        error.digest.startsWith("NEXT_REDIRECT"))
    ) {
      throw error;
    }

    const causeErr = error?.cause?.err || error?.cause;
    const code = causeErr?.code || error?.code;
    const name = causeErr?.name || error?.name;

    if (code === "OTPError" || name === "OTPError") {
      return { error: "OTPError", message: "OTP required" };
    }

    if (
      code === "InvalidCredentialsError" ||
      name === "InvalidCredentialsError" ||
      code === "credentials" ||
      name === "CredentialsSignin"
    ) {
      return {
        error: "InvalidCredentialsError",
        message: "Invalid credentials",
      };
    }

    const errorMsg = causeErr?.message || error?.message || "AuthError";
    return {
      error: name || "AuthError",
      message: errorMsg,
    };
  }
};
