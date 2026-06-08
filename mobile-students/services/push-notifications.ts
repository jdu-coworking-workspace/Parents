import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import api from "@/services/api-client";

export type PushPermission =
    | "granted"
    | "denied"
    | "undetermined"
    | "device_unsupported"
    | "error";

export type PushInitResult = {
    status: PushPermission;
    token?: string;
    error?: unknown;
};

export async function initPushNotifications(): Promise<PushInitResult> {
    try {
        if (!Device.isDevice) {
            return { status: "device_unsupported" };
        }

        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("default", {
                name: "Default Notifications",
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#FF231F7C",
                sound: "default",
                enableVibrate: true,
                enableLights: true,
                showBadge: true,
            });
        }

        const settings = await Notifications.getPermissionsAsync();
        let status = settings.status;

        if (status !== "granted") {
            const request = await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                    allowDisplayInCarPlay: true,
                    allowCriticalAlerts: false,
                    provideAppNotificationSettings: true,
                    allowProvisional: false,
                },
            });
            status = request.status;
        }

        if (status !== "granted") {
            return { status };
        }

        if (Platform.OS === "ios") {
            await Notifications.setBadgeCountAsync(0);
        }

        let token: string;

        if (Platform.OS === "android") {
            const { data } = await Notifications.getDevicePushTokenAsync();
            token = data;
        } else {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId;

            const { data } = await Notifications.getExpoPushTokenAsync({
                projectId,
            });
            token = data;
        }

        console.log("Recipient Expo push token from your app:", token);

        return { status: "granted", token };
    } catch (error) {
        console.error("[Push] Init error →", error);
        return { status: "error", error };
    }
}

export function setupNotificationHandler() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}

export async function sendPushTokenToBackend(token: string): Promise<boolean> {
    try {
        const response = await api.post(
            "/student/device-token",
            { token },
            { suppressErrorLog: true },
        );

        return response.ok;
    } catch (error) {
        console.warn("[Push] Failed to upload student token →", error);
        return false;
    }
}