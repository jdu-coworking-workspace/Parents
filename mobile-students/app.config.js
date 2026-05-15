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
    scheme: "mobilestudents-dev",
  },
  preview: {
    name: "Student Notification (Preview)",
    androidPackage: "com.jduapp.studentnotification.preview",
    iosBundleId: "com.jduapp.studentnotification.preview",
    scheme: "mobilestudents-preview",
  },
  production: {
    name: "Student Notification",
    androidPackage: "com.jduapp.studentnotification",
    iosBundleId: "com.jduapp.studentnotification",
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
    icon: "./assets/images/icon.png",
    scheme: variantConfig.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    updates: {
      url: 'https://u.expo.dev/70c8e8fd-516f-437d-b2ed-9867ee7fca17',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: variantConfig.iosBundleId,
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
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: variantConfig.androidPackage,
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
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
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
