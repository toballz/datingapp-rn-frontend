import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState, Dimensions, Image, PermissionsAndroid, Platform, Vibration } from 'react-native';
import { sessionManager } from './SessionContext';
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import Geolocation from 'react-native-geolocation-service';
import appjson from '../../app.json';
import NetInfo from '@react-native-community/netinfo';
import { namer } from './static';
import notifee from '@notifee/react-native';
import { Asset, ImageLibraryOptions, launchImageLibrary } from 'react-native-image-picker';
import { Toastx } from './customNotification';
import { SocketClient } from './socket_realtimeData';
import { createNavigationContainerRef } from '@react-navigation/native';

// Define API URL
export const hostServer = () => {
  let h_0 = "https://api.q1-site.site"; //live server
  // h_0 = "http://192.168.12.145:2000"; 
  //return h_0;
  if (Platform.OS === "android" && DeviceInfo.isEmulatorSync()) {
    h_0 = "http://10.0.2.2:2000"; // if android emulator
  }
  return h_0;
}
export const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
export const navigationRef = createNavigationContainerRef<any>();


// Helper functions for encoding/decoding
export const help = {
  randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  encodeStr: (st: string): string => {
    // Placeholder for actual encoding logic
    return st.split('').reverse().join('');
  },
  decodeStr: (st: string): string => {
    // Placeholder for actual decoding logic
    return st.split('').reverse().join('');
  },
  randomAlphanumeric: (max: number, min: number = 6, upperCase: boolean = false) => {
    const chars =
      (upperCase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '') +
      'abcdefghijklmnopqrstuvwxyz0123456789';

    const length = Math.floor(Math.random() * (max - min + 1)) + min;

    return Array.from({ length }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  },

  getageFromDOB: (yyyymmdd: string) => {
    try {
      if (!/^\d{8}$/.test(yyyymmdd)) return null; // Basic validation

      const year = parseInt(yyyymmdd.substring(0, 4), 10);
      const month = parseInt(yyyymmdd.substring(4, 6), 10) - 1; // 0-indexed
      const day = parseInt(yyyymmdd.substring(6, 8), 10);

      const dob = new Date(year, month, day);
      const now = new Date();

      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();

      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
        age--;
      }
      return age.toString();
    } catch (e: any) {
      logReport({ type: 'function', extra: '', useraction: 'getageFromDOB', logMessage: e?.message, stackTrace: e });
      return null;
    }
  },
  getDOBFromAge: (age: string) => {
    try {
      const todayDate = new Date();
      const numericAge = Number(age);
      const year = todayDate.getFullYear() - numericAge;
      const month = String(todayDate.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
      const day = String(todayDate.getDate()).padStart(2, '0');

      return `${year}${month}${day}`;
    } catch (e: any) {
      logReport({ type: 'function', extra: '', useraction: 'getDOBFromAge', logMessage: e?.message, stackTrace: e });
      return null;
    }
  },
  cmToFtIn: (cmValue: number) => {
    try {
      if (isNaN(cmValue)) return null;

      const inches = cmValue / 2.54;
      const feet = Math.floor(inches / 12);
      const remainingInches = Math.round(inches % 12);

      return (`${feet}ft' ${remainingInches}in`);
    } catch (e: any) {
      logReport({ type: 'function', extra: '', useraction: 'cmToFtIn', logMessage: e?.message, stackTrace: e });
      return null;
    }
  },
  milesToKM: (milesValue: number) => {
    try {
      if (isNaN(milesValue)) return null;

      const km = milesValue * 1.60934;

      return km;
    } catch (e: any) {
      logReport({ type: 'function', extra: '', useraction: 'milestokm', logMessage: e?.message, stackTrace: e });
      return null;
    }
  },
  timeAgo: (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString.replace(' ', 'T')); // ISO fix
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    for (const [unit, value] of Object.entries(intervals)) {
      const count = Math.floor(seconds / value);
      if (count >= 1) return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
    }

    return 'just now';
  }
};


export const __init__app = async ({ doAgain = false }: { doAgain?: boolean }): Promise<void> => {
  const currentSession = sessionManager.getCurrentSession();
  let ro = "";

  await llStorage.CONFIG.generateFromServer();
  //console.log(llStorage.CONFIG.get()?.mapper);
  ro += "sqlmapper ";

  if (doAgain || !Array.isArray(llStorage.deviceSpec.get())) { await llStorage.deviceSpec.load(); ro += "device-specs "; };
  if (doAgain || !Array.isArray(llStorage.currentProfile.get()) && currentSession?.x_omi_payload_hash) { await llStorage.currentProfile.load(); ro += "userProfile "; };

  // connect with socket for realtime info
  if (navigationRef === null) return;
  (() => {
    const userId = llStorage.currentProfile.get()?.currentUser?.user_id;
    if (!userId) return;
    SocketClient.connect(userId, (data) => {
      const matchId = convoHelper.matchId.get();
      const retrivedData = data?.message;
      if (data.event === 'message') {
        if (retrivedData?.type !== "single-convo") return;
        console.log(66, retrivedData?.type)
        /*
        {
            "type":"single-convo",
            "matchId": "pyca6r5dngyrbauhnn916a", 
            "payload":{
                "firstName":"firstName",
                "lastMessage":"ghufhjg"
            }
        } 
        */
        if (matchId === retrivedData?.matchId) {
          if (navigationRef.isReady()) navigationRef.setParams({ realtimedata: retrivedData?.payload });

        } else {
          const nmessage = (retrivedData?.payload?.firstName ?? "Someone") + " has messaged you";
          if (AppState.currentState === 'active') {
            Vibration.vibrate(100);
            Toastx.show({
              title: nmessage,
              message: "Tap to view message",
              type: 'info',
              onPress: () => {
                if (navigationRef.isReady()) navigationRef.navigate(namer.navigation.conversation, { matchId: retrivedData?.matchId });
              }
            });
          } else if (AppState.currentState === 'background' || AppState.currentState === 'inactive') {
            displsyNotification(nmessage, "Tap to view message");
          }
        }
      }
    });
  })();
}



// 
export const displsyNotification = async (title: string, body?: string) => {
  try {
    await notifee.requestPermission();
    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
    });
    await notifee.displayNotification({
      title: title,
      body: body,
      android: {
        channelId: channelId,
        pressAction: {
          id: 'default',
        },
      },
    });
  } catch (error: any) {
    logReport({ type: 'function', extra: "Error displaying notification:", useraction: 'displayNotification', logMessage: error?.message, stackTrace: error });
  }
};


export const sleep = (ms: number) => new Promise((r: any) => setTimeout(r, ms));

// Log function for debugging
export const logReport = ({ type, extra, useraction, url, logMessage, stackTrace, reporteduserId }: { type: string, extra?: string, useraction: string, url?: string, logMessage: string, stackTrace?: any, reporteduserId?: string }): void => {

  (async () => {
    try {
      const logD = {
        "type": type,
        "_error": {
          "url": url,
          "useraction": useraction,
          "description": logMessage,
          "extras": extra,
          "stackMessage": stackTrace
        },
        "user": { "reporteduser": reporteduserId },
        "device": llStorage.deviceSpec.get(),
        "app": {
          "version_app": DeviceInfo.getVersion(),
          "version_bundle": appjson.appversion,
          "buildNumber_app": DeviceInfo.getBuildNumber(),
          "buildNumber_bundle": appjson.bundlebuildnumber,
          "displayName_app": DeviceInfo.getApplicationName(),
          "displayName_bundle": appjson.name,
          "appPackageName": DeviceInfo.getBundleId(),
          "appVersionName": DeviceInfo.getReadableVersion(),
          "FirstInstallTime": await DeviceInfo.getFirstInstallTime(),
          "LastUpdateTime": await DeviceInfo.getLastUpdateTime(),
        },
      }

      try {
        console.log("logReport:", logD);
        const res = await fetch(hostServer() + '/api/core/v1/pushLogReport', {
          method: 'POST', // Explicitly set method
          headers: {
            'Content-Type': 'application/json', // Specify content type
            'Accept': 'application/json', // Specify accepted response type
            'X-omi-Auth': sessionManager.getCurrentSession()?.x_omi_payload ?? '',
            'X-omi-Hash': sessionManager.getCurrentSession()?.x_omi_payload_hash ?? ''
          },
          body: JSON.stringify({ // Properly stringify the entire body
            action: 'generateLogStats',
            scripts: JSON.stringify(logD) // No need to stringify logD twice
          })
        });
      } catch (e: any) {
        console.log("logReport fetch error:", e.message);
        logD._error.extras += " |||| logReport fetch error: " + e.message;
      }
    } catch (error: any) {
      console.error("logReport: fetching device info", error.message);
    }
  })();

};


// HTTP request function (GET/POST)
export const _http_request = async ({ reqType, bodyArray, headerArray, customApiUrl }: {
  reqType: 'GET' | 'POST', bodyArray?: Record<string, any>,
  headerArray?: Record<string, string>, customApiUrl: string
}): Promise<any | null> => {
  //start
  const currentSession = sessionManager.getCurrentSession();
  const apiUrlToUse = customApiUrl;
  let axiosResponse = null;

  let config = {
    method: reqType.toLowerCase(),
    url: apiUrlToUse,
    headers: headerArray ?? {
      'Content-Type': 'application/json',
      'X-omi-Auth': currentSession?.x_omi_payload,
      'X-omi-Hash': currentSession?.x_omi_payload_hash,
      "Accept-Encoding": "identity"
    },
    timeout: 20000,
  } as any;

  try {
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      Alert.alert("Info", "You are not connected to the internet. Check your wifi connection");
      return false;
    }
    //
    //


    if (reqType === 'POST') {
      config.data = bodyArray;
      if (bodyArray instanceof FormData) {
        config.headers['Content-Type'] = 'multipart/form-data';
      }
    } else {
      config.params = bodyArray;
    }

    axiosResponse = await axios(config);
    //console.log(axiosResponse);
    const contentType = axiosResponse?.headers['content-type'];
    if (contentType?.includes('application/json')) {
      const jsonres = axiosResponse?.data;

      // json error
      if (typeof jsonres !== 'object' || jsonres === null) {
        logReport({ type: "http", extra: jsonres, useraction: 'http JSON parse', url: apiUrlToUse, logMessage: "", stackTrace: "" });
      }
      return jsonres;
    }
    // fallback for text
    return typeof axiosResponse?.data === 'string' ? axiosResponse?.data : JSON.stringify(axiosResponse?.data);

  } catch (err: any) {
    const status = err.response?.status;
    if (err.response) {
      if (status === 401) {
        //session expired 
        sessionManager?.updateSession({ x_omi_payload: null, x_omi_payload_hash: null });
        await AsyncStorage.removeItem(namer.storage.sessionId);
        Toastx.show({ type: 'info', message: 'Session expired, login again.' });
        return;
      } else if (status === 404) {
        Toastx.show({ type: 'error', message: 'Resource not found!' });
      }
      logReport({ type: "http " + status, useraction: 'url access', url: apiUrlToUse, logMessage: err.message, stackTrace: err.response });
      return null;
    } else {

      Toastx.show({ type: 'error', message: 'Server Error: Network timeout' });
    }

    logReport({ type: 'http -' + status, extra: JSON.stringify(axiosResponse ?? config), useraction: 'HTTP request error', url: apiUrlToUse, logMessage: err.message, stackTrace: err });
    return null;
  }
};


// Handle login
export const _handle_Signin = async (phoneNumber: string, callingCode: string, vscode: string | null): Promise<{ code: number, message?: string, redirect?: string }> => {
  let err: string | null = null;
  if (!vscode || vscode.length < 6) {
    if (phoneNumber.length <= 5) {
      err = 'Invalid username or password!.';
    }
    //
    if (err === null) {
      const loginRes = await _http_request({
        customApiUrl: hostServer() + '/api/login',
        reqType: 'POST', bodyArray: {
          cc: callingCode,
          user_phone: phoneNumber
        }
      });
      if (loginRes?.code === 200) {
        await sessionManager.updateSession({
          x_omi_payload: "",
          x_omi_payload_hash: null,
        });
        return {
          code: 200,
          message: "Login sus"
        };
      } else if (loginRes?.code === 404) {
        return {
          code: 404,
          message: "redirecting to signup",
          redirect: "signup"
        };
      } else {
        err = loginRes?.message ?? "Error logging in!";
      }
    }
  } else if (vscode && vscode.length >= 6) {
    if (err === null) {
      const loginRes = await fetch(hostServer() + "/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_phone: phoneNumber,
          cc: callingCode,
          vcode: vscode,
        }),
      });

      const headers = loginRes.headers;
      const response = await loginRes.json();

      if (response?.code === 200) {
        const auth = headers.get('x-omi-auth') ?? '';
        const hash = headers.get('x-omi-hash') ?? '';

        await AsyncStorage.setItem(namer.storage.sessionId, auth);
        await AsyncStorage.setItem(namer.storage.sessionIdVerify, hash);
        await sessionManager.updateSession({
          x_omi_payload: auth,
          x_omi_payload_hash: hash,
        });

        return {
          code: 200,
          message: "Login success"
        };
      } else {
        err = response?.message ?? "Error logging in!";
      }
    }
  }

  // Login failed
  return {
    code: 400,
    message: err ?? "Error signing in function."
  };
};

// Handle signup
export const _handle_Signup = async (
  textInput_: { verifypassword: string; password: string; email: string },
  get_setuserId: (uid: string) => void
): Promise<void> => {
  let err: string | false = false;

  if (textInput_.verifypassword !== textInput_.password) {
    err = 'Passwords do not match!';
  } else if (textInput_.password.length <= 5) {
    err = 'Password should be greater than 5 characters!';
  } else if (textInput_.email.length <= 5) {
    err = 'Invalid Email!';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textInput_.email)) {
    err = 'Invalid Email!!';
  }

  if (!err) {
    const signupRes = await _http_request({
      reqType: 'POST',
      customApiUrl: hostServer() + '/api/signup',
      bodyArray: {
        action: '2bu4tywnr7',
        fullname: help.encodeStr('frederick owens'),
        email: help.encodeStr(textInput_.email),
        password: help.encodeStr(textInput_.password),
      }
    });
    if (signupRes?.code === 200) {
      let uid = signupRes?.user_id ?? '';
      if (uid !== '') {
        //await AsyncStorage.setItem(namer.userId, uid);
        get_setuserId(uid);
      }
    } else {
      err = signupRes?.message ?? 'Account not created!';
    }
  }
  if (err) {
    Toastx.show({ type: 'error', message: 'Signup Error\n' + err });
    Alert.alert('Signup Failed', err);
  }
};


// Get current location with permission handling
export async function getCurrentLocation() {
  //get locations
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Toastx.show({ type: 'error', message: 'Location permission denied' });
    }
  }
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    if (status !== 'granted') {
      Toastx.show({ type: 'error', message: 'Location permission denied' });
    }
  }
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve(position),
      error => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
}




// Local storage management
export class llStorage {
  private static tempDevieSpec: any = null;
  private static tempProfile: any = null;
  private static tempMapper: any = null;
  private static tempProducts: any = null;

  private static normalizeProductsPayload = (rawProducts: any) => {
    if (!rawProducts) return { mainsub: {}, consumables: [] };

    if (!Array.isArray(rawProducts) && typeof rawProducts === "object") {
      if (rawProducts?.mainsub || rawProducts?.consumables) {
        return rawProducts;
      }
    }

    if (!Array.isArray(rawProducts)) {
      return { mainsub: {}, consumables: [] };
    }

    const normalized = {
      mainsub: {} as Record<string, any[]>,
      consumables: [] as any[],
    };

    const mainsubRows = rawProducts.filter(
      (row: any) => String(row?.category ?? "").toLowerCase() === "mainsub"
    );
    let tierCounter = 1;

    mainsubRows.forEach((row: any) => {
      const productList = Array.isArray(row?.product_list) ? row.product_list : [];
      productList.forEach((product: any) => {
        const tierKey = `mainsub.${tierCounter++}`;
        const variants = Array.isArray(product?.product_variant) ? product.product_variant : [];

        const mappedVariants = variants.map((variant: any, variantIndex: number) => {
          const parsedInterval = Number(variant?.interval_days ?? variant?.billing_interval ?? NaN);
          const safeIntervalDays = Number.isFinite(parsedInterval) && parsedInterval > 0
            ? parsedInterval
            : (variantIndex + 1);

          return {
            sku: product?.sku ?? `${tierKey}.${variantIndex + 1}`,
            name: product?.name ?? tierKey,
            description: product?.description ?? {},
            price: Number(variant?.price ?? 0),
            interval_days: safeIntervalDays,
            billing_interval: Number(variant?.billing_interval ?? variant?.interval_days ?? 0),
            variant_name: variant?.variant_name ?? variant?.name ?? "",
            meta_data:
              (variant?.meta_data && typeof variant.meta_data === "object")
                ? variant.meta_data
                : ((variant?.description && typeof variant.description === "object")
                  ? variant.description
                  : { cycle: variant?.variant_name ?? variant?.name ?? "" }),
            external_3rdparty_store_product_id: variant?.external_3rdparty_store_product_id ?? "",
            v_id: variant?.v_id
          };
        });

        normalized.mainsub[tierKey] = mappedVariants.length > 0
          ? mappedVariants
          : [{
            sku: product?.sku ?? tierKey,
            name: product?.name ?? tierKey,
            description: product?.description ?? {},
            price: 0,
            interval_days: 0,
            billing_interval: 0,
            variant_name: "",
            meta_data: {},
            external_3rdparty_store_product_id: "",
          }];
      });
    });

    rawProducts
      .filter((row: any) => String(row?.category ?? "").toLowerCase() !== "mainsub")
      .forEach((row: any) => {
        const productList = Array.isArray(row?.product_list) ? row.product_list : [];
        productList.forEach((product: any) => {
          normalized.consumables.push({
            sku: product?.sku ?? "",
            name: product?.name ?? String(row?.category ?? "consumable"),
            description: product?.description ?? {},
            category: row?.category ?? "consumables",
            count: Number(product?.count ?? 0),
          });
        });
      });

    return normalized;
  }


  public static CONFIG = {
    get: () => { return { mapper: this.tempMapper } },
    generateFromServer: async (): Promise<void> => {
      const sessIdStorage = await AsyncStorage.getItem(namer.storage.sessionId);
      if (!sessIdStorage) return;

      const server = await _http_request({
        reqType: "POST",
        customApiUrl: `${hostServer()}/api/core/v1/getVersioning`,
        bodyArray: {
          _gpl: true,
          _bi: true,
          _gm: true
        }
      });

      if (server?.code === 200) {
        await AsyncStorage.setItem(namer.storage.mapper_payload, JSON.stringify(server?.mapper_payload));
        this.tempMapper = server?.mapper_payload;
        this.tempProducts = this.normalizeProductsPayload(server?.products);
      } else {
        logReport({ type: "function", extra: server, useraction: "CONFIG.generateFromServer", url: `${hostServer()}/api/core/v1/getVersioning`, logMessage: "Failed to fetch versioning data", stackTrace: "" });
      }

    }

  }

  public static purchasing_product = {
    get: () => this.tempProducts
  }


  public static deviceSpec = {
    get: () => {
      return this.tempDevieSpec;
    },
    load: async () => {

      const deviceData = {
        Id: DeviceInfo.getDeviceId(),
        Type: DeviceInfo.getDeviceType(),
        Model: DeviceInfo.getModel(),
        Brand: DeviceInfo.getBrand(),
        ScreenDimension: Dimensions.get('screen'),
      };

      // Parallel async calls
      const asyncProps = await Promise.allSettled([
        DeviceInfo.getDeviceName(),
        DeviceInfo.getDevice(),
        DeviceInfo.isEmulator(),
        DeviceInfo.getManufacturer(),
        DeviceInfo.getSerialNumber(),
        DeviceInfo.getBootloader(),
        DeviceInfo.getFingerprint(),
        DeviceInfo.getUserAgent(),
        DeviceInfo.getBaseOs(),
        DeviceInfo.getBatteryLevel(),
        DeviceInfo.getCarrier(),
        DeviceInfo.getCodename(),
        DeviceInfo.getDeviceToken(),
        DeviceInfo.isPinOrFingerprintSet(),
        DeviceInfo.isMouseConnected(),
        DeviceInfo.getUniqueId(),
      ]);

      const [
        Name, Device, isEmulator, Manufacturer, SerialNumber,
        Bootloader, Fingerprint, UserAgent, BaseOs, BatteryLevel,
        Carrier, Codename, Token, isPinOrFingerprintSet, isMouseConnected,
        InstallationId
      ] = asyncProps.map(r => r.status === 'fulfilled' ? r.value : null);



      const deviceDataO = {
        ...deviceData,
        Name, Device, isEmulator, Manufacturer, SerialNumber,
        Bootloader, Fingerprint, UserAgent, BaseOs, BatteryLevel,
        Carrier, Codename, Token, isPinOrFingerprintSet, isMouseConnected,
        InstallationId,
        Os: `${DeviceInfo.getSystemName()} ${DeviceInfo.getSystemVersion()}`
      }


      this.tempDevieSpec = deviceDataO;
    }
  }

  public static currentProfile = {
    get: () => {
      return this.tempProfile;
    },
    load: async () => {
      this.tempProfile = await _http_request({
        customApiUrl: hostServer() + '/api/core/v1/getProfile',
        reqType: 'POST',
      });
    },
    update: async (newData: any) => {
      // update((getc: any) => ({ currentUser: { ...getc, settings: getuser_settings } }));
      if (typeof newData === "function") {
        this.tempProfile = {
          ...this.tempProfile,
          ...newData(this.tempProfile),
        };
      } else {
        // direct object merge
        this.tempProfile = { ...this.tempProfile, ...newData };
      }
    }
  }
}


export class convoHelper {
  private static tempMatchId: string | null;

  public static matchId = {
    get: () => {
      return convoHelper.tempMatchId;
    },
    set: (val: string | null) => {
      convoHelper.tempMatchId = val;
    }
  }
}

export class mediaHandler {
  public static handleSelectFromGallery = async (sacr: ImageLibraryOptions): Promise<Asset[] | null> => {
    try {
      const result = await launchImageLibrary(sacr);

      if (result.assets && result.assets.length > 0) {
        const media = result.assets;
        return media;
      }
      return null;
    } catch (error) {
      logReport({ type: "media", useraction: "select media error", logMessage: 'Error selecting media:', stackTrace: error });
      Toastx.show({ type: 'error', message: 'Failed to select media' });
      return null;
    }
  };

}

export class uploadHandler {
  public static requestPresignedURL_Upload = async (extension: string, bucketType: string, convoId?: string) => {
    // Build request body with meta wrapper
    const requestBody: any = {
      meta: {
        extension: extension,
        bucketType: bucketType,
      }
    };

    // Add convoId if it's a conversation type
    if (bucketType?.startsWith('convo') && convoId) {
      requestBody.meta.convoId = convoId;
    }

    const data = await _http_request({
      customApiUrl: hostServer() + "/api/core/v1/handleFileUpload",
      reqType: 'POST',
      bodyArray: requestBody
    });
    console.log("Received file upload response:", data);
    if (data?.code !== 200 || !data?.data?.uploadUrl) {
      throw new Error(data?.message ?? 'Unable to generate upload URL');
    }
    return data.data;
  };
}
