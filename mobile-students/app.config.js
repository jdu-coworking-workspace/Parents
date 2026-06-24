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
    icon: "./assets/images/icon-dev/ios-dev.png",
    androidIcon: "./assets/images/icon-dev/android-dev.png",
    splashIcon: "./assets/images/icon-dev/splash-icon-dev.png",
    scheme: "mobilestudents-dev",
  },
  preview: {
    name: "Student Notification (Preview)",
    androidPackage: "com.jduapp.studentnotification.preview",
    iosBundleId: "com.jduapp.studentnotification.preview",
    icon: "./assets/images/icon-prev/ios-prev.png",
    androidIcon: "./assets/images/icon-prev/android-prev.png",
    splashIcon: "./assets/images/icon-prev/splash-icon-prev.png",
    scheme: "mobilestudents-preview",
  },
  production: {
    name: "Student Notification",
    androidPackage: "com.jduapp.studentnotification",
    iosBundleId: "com.jduapp.studentnotification",
    icon: "./assets/images/icons/ios.png",
    androidIcon: "./assets/images/icons/android.png",
    splashIcon: "./assets/images/icons/splash-icon.png",
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
    icon: variantConfig.icon,
    scheme: variantConfig.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    updates: {
      url: "https://u.expo.dev/70c8e8fd-516f-437d-b2ed-9867ee7fca17",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: variantConfig.iosBundleId,
      icon: variantConfig.icon,
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
        backgroundColor: "#E6F4FE",
        foregroundImage: variantConfig.androidIcon,
        monochromeImage: variantConfig.androidIcon,
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
          image: variantConfig.splashIcon,
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-notifications",
        {
          icon: variantConfig.androidIcon,
          color: "#000000",
        },
      ],
      "expo-secure-store",
      "expo-web-browser",
      [
        "expo-media-library",
        {
          photosPermission:
            "We need access to your photo library to save images to your gallery.",
          savePhotosPermission:
            "We need access to your photo library to save images to your gallery.",
          isAccessMediaLocationEnabled: false,
          granularPermissions: ["photo"],
        },
      ],
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
