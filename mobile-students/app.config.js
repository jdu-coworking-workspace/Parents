require("dotenv").config();
const packageJson = require("./package.json");

const getVariant = () =>
  process.env.APP_VARIANT || process.env.EAS_BUILD_PROFILE || "development";

const variant = getVariant();

const configByVariant = {
  development: {
    name: "Student Notification (Dev)",
    androidPackage: "com.jduapp.studentnotification.dev",
    iosBundleId: "com.jduapp.studentnotification.dev",
    iosIconTinted: "./assets/images/icon-dev/ios-tinted-dev.png",
    iosIconDark: "./assets/images/icon-dev/ios-dark-dev.png",
    iosIconLight: "./assets/images/icon-dev/ios-light-dev.png",
    splashLight: "./assets/images/icon-dev/splash-icon-light-dev.png",
    splashDark: "./assets/images/icon-dev/splash-icon-dark-dev.png",
    adaptiveIcon: "./assets/images/icon-dev/adaptive-icon-dev.png",
    scheme: "mobilestudents-dev",
  },
  preview: {
    name: "Student Notification (Preview)",
    androidPackage: "com.jduapp.studentnotification.preview",
    iosBundleId: "com.jduapp.studentnotification.preview",
    iosIconTinted: "./assets/images/icon-prev/ios-tinted-preview.png",
    iosIconDark: "./assets/images/icon-prev/ios-dark-preview.png",
    iosIconLight: "./assets/images/icon-prev/ios-light-preview.png",
    splashLight: "./assets/images/icon-prev/splash-icon-light-preview.png",
    splashDark: "./assets/images/icon-prev/splash-icon-dark-preview.png",
    adaptiveIcon: "./assets/images/icon-prev/adaptive-icon-preview.png",
    scheme: "mobilestudents-preview",
  },
  production: {
    name: "Student Notification",
    androidPackage: "com.jduapp.studentnotification",
    iosBundleId: "com.jduapp.studentnotification",
    iosIconTinted: "./assets/images/icons/ios-tinted.png",
    iosIconDark: "./assets/images/icons/ios-dark.png",
    iosIconLight: "./assets/images/icons/ios-light.png",
    splashLight: "./assets/images/icons/splash-icon-light.png",
    splashDark: "./assets/images/icons/splash-icon-dark.png",
    adaptiveIcon: "./assets/images/icons/adaptive-icon.png",
    scheme: "mobilestudents",
  },
};

const variantConfig = configByVariant[variant] || configByVariant.development;

console.log(`Using variant: ${variant}`);

module.exports = ({ config }) => {
  return {
    ...config,
    runtimeVersion: packageJson.version,
    name: variantConfig.name,
    slug: "student-notification",
    version: packageJson.version,
    orientation: "portrait",
    icon: variantConfig.iosIconLight,
    scheme: variantConfig.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    updates: {
      url: "https://u.expo.dev/70c8e8fd-516f-437d-b2ed-9867ee7fca17",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: variantConfig.iosBundleId,
      icon: variantConfig.iosIconLight,
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
        ITSAppUsesNonExemptEncryption: false,
        UIStatusBarStyle: "UIStatusBarStyleLightContent",
        UIViewControllerBasedStatusBarAppearance: false,
        // Add URL schemes for all custom schemes (not just current variant)
        CFBundleURLTypes: [
          {
            CFBundleURLName: "mobilestudents",
            CFBundleURLSchemes: [
              "mobilestudents",
              "mobilestudents-dev",
              "mobilestudents-preview",
            ],
          },
        ],
      },
      // CRITICAL: Add push notification entitlements for iOS builds
      entitlements: {
        "aps-environment":
          variant === "production" ? "production" : "development",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: variantConfig.adaptiveIcon,
        monochromeImage: variantConfig.adaptiveIcon,
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: variantConfig.androidPackage,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      statusBar: {
        barStyle: "light-content",
        backgroundColor: "#3B81F6",
      },
      navigationBar: {
        visible: false,
      },
      intentFilters: [
        // Add support for all custom schemes in all app variants
        {
          action: "VIEW",
          data: [
            { scheme: "mobilestudents" },
            { scheme: "mobilestudents-dev" },
            { scheme: "mobilestudents-preview" },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: variantConfig.splashLight,
          imageWidth: 200,
          resizeMode: "contain",
          dark: {
            image: variantConfig.splashDark,
            backgroundColor: "#000000",
            imageWidth: 200,
          },
          ios: {
            backgroundColor: "#ffffff",
            image: variantConfig.splashLight,
            imageWidth: 120,
            resizeMode: "contain",
            dark: {
              image: variantConfig.splashDark,
              backgroundColor: "#000000",
              imageWidth: 120,
            },
          },
        },
      ],
      [
        "expo-notifications",
        {
          icon: variantConfig.iosIconLight,
          color: "#000000",
        },
      ],
      "expo-secure-store",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "70c8e8fd-516f-437d-b2ed-9867ee7fca17",
      },
    },
    owner: "jduapp",
  };
};
