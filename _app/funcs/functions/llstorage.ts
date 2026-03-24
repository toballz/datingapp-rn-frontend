
import AsyncStorage from '@react-native-async-storage/async-storage';
import { _http_request, hostServer, } from '../../funcs/functions';
import { namer } from '../static';
import DeviceInfo from 'react-native-device-info';
import { Dimensions } from 'react-native';

export class cacheStorage {
    // Profile
    private static profileMemoryCache: any = null;
    private static profileLoadingPromise: Promise<any> | null = null;
    public static getCurrentUserProfile = (forceRefresh = false): Promise<any> => {
        // Return from memory cache if available and not forcing refresh
        if (!forceRefresh && this.profileMemoryCache) {
            console.log("profile from memory cache");
            return Promise.resolve(this.profileMemoryCache);
        }

        // Prevent duplicate concurrent requests
        if (!forceRefresh && this.profileLoadingPromise) {
            console.log("profile request in progress, waiting...");
            return this.profileLoadingPromise;
        }

        // Start new request
        this.profileLoadingPromise = (async () => {
            try {
                // Check AsyncStorage cache if not forcing refresh
                if (!forceRefresh) {
                    try {
                        const cachedProfile = await AsyncStorage.getItem(namer.storage.currentUserProfile);
                        if (cachedProfile) {
                            console.log("profile from AsyncStorage");
                            this.profileMemoryCache = JSON.parse(cachedProfile);
                            return this.profileMemoryCache;
                        }
                    } catch (error) {
                        console.error("Error reading profile from AsyncStorage:", error);
                    }
                }

                // Fetch fresh data from API
                console.log("fetching profile from API");
                const profile = await _http_request({
                    customApiUrl: hostServer() + '/api/core/v1/getProfile',
                    reqType: 'POST',
                });

                if (profile?.currentUser !== undefined && profile?.currentUser !== null && profile?.currentUser !== "") {
                    // Cache in memory and AsyncStorage
                    this.profileMemoryCache = profile?.currentUser;
                    await AsyncStorage.setItem(namer.storage.currentUserProfile, JSON.stringify(profile?.currentUser));
                } else {
                    this.profileMemoryCache = null;
                    await AsyncStorage.removeItem(namer.storage.currentUserProfile);
                    console.log("Profile removed")
                }
                return this.profileMemoryCache;
            } catch (error) {
                console.error("Error fetching profile:", error);
                this.profileLoadingPromise = null;
                throw error;
            }
        })();

        return this.profileLoadingPromise;
    }



    // Device specs cache
    private static deviceMemoryCache: any = null;
    private static deviceLoadingPromise: Promise<any> | null = null;
    public static getDeviceData = (forceRefresh = false): Promise<any> => {
        // memory cache
        if (!forceRefresh && this.deviceMemoryCache) {
            console.log("device info from cache");
            return this.deviceMemoryCache;
        }

        // prevent duplicate calls
        if (!forceRefresh && this.deviceLoadingPromise) {
            return this.deviceLoadingPromise;
        }

        this.deviceLoadingPromise = (async () => {
            // storage cache
            if (!forceRefresh) {
                const getFromLocalStorage = await AsyncStorage.getItem(namer.storage.deviceSpecs);
                if (getFromLocalStorage) {
                    console.log("device info from LocalStorage");
                    this.deviceMemoryCache = JSON.parse(getFromLocalStorage);
                    return this.deviceMemoryCache;
                }
            }

            // sync base
            const base = {
                Id: DeviceInfo.getDeviceId(),
                Type: DeviceInfo.getDeviceType(),
                Model: DeviceInfo.getModel(),
                Brand: DeviceInfo.getBrand(),
                ScreenDimension: Dimensions.get('screen'),
                Os: `${DeviceInfo.getSystemName()}_${DeviceInfo.getSystemVersion()}`
            };

            // async batch
            const results = await Promise.allSettled([
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

            const values = results.map(r =>
                r.status === 'fulfilled' ? r.value : null
            );

            const [
                Name, Device, isEmulator, Manufacturer, SerialNumber,
                Bootloader, Fingerprint, UserAgent, BaseOs, BatteryLevel,
                Carrier, Codename, Token, isPinOrFingerprintSet, isMouseConnected,
                InstallationId
            ] = values;

            const full = {
                ...base,
                Name,
                Device,
                isEmulator,
                Manufacturer,
                SerialNumber,
                Bootloader,
                Fingerprint,
                UserAgent,
                BaseOs,
                BatteryLevel,
                Carrier,
                Codename,
                Token,
                isPinOrFingerprintSet,
                isMouseConnected,
                InstallationId
            };

            this.deviceMemoryCache = full;
            await AsyncStorage.setItem(namer.storage.deviceSpecs, JSON.stringify(full));

            return full;
        })();

        return this.deviceLoadingPromise;
    }




    // Device
    // Products
    private static productsMemoryCache: any = null;
    private static productsLoadingPromise: Promise<any> | null = null;
    public static getProducts = (forceRefresh = false): Promise<any> => {
        // Return from memory cache if available and not forcing refresh
        if (!forceRefresh && this.productsMemoryCache) {
            console.log("getProducts info from memory cache");
            return Promise.resolve(this.productsMemoryCache);
        }

        // Prevent duplicate concurrent requests
        if (!forceRefresh && this.productsLoadingPromise) {
            console.log("productsLoadingPromise request in progress, waiting...");
            return this.productsLoadingPromise;
        }

        // Start new request
        this.productsLoadingPromise = (async () => {
            try {
                // Check AsyncStorage cache if not forcing refresh
                if (!forceRefresh) {
                    try {
                        const cachedProducts = await AsyncStorage.getItem(namer.storage.products);
                        if (cachedProducts) {
                            console.log("getProducts from AsyncStorage");
                            this.productsMemoryCache = JSON.parse(cachedProducts);
                            return this.productsMemoryCache;
                        }
                    } catch (error) {
                        console.error("Error reading getProducts from AsyncStorage:", error);
                    }
                }

                // Fetch fresh data from API
                console.log("fetching getProducts from API");
                const response = await _http_request({
                    customApiUrl: hostServer() + '/api/core/v1/getProducts',
                    reqType: 'POST',
                });

                console.log("API response:", response);

                // Extract products from response
                const productsData = response?.products;

                if (productsData !== undefined && productsData !== null && productsData !== "") {
                    // Cache in memory and AsyncStorage
                    console.log("getProducts added successfully");
                    this.productsMemoryCache = productsData;
                    await AsyncStorage.setItem(namer.storage.products, JSON.stringify(productsData));
                } else {
                    // No valid products data
                    this.productsMemoryCache = null;
                    await AsyncStorage.removeItem(namer.storage.products);
                    console.log("getProducts removed - no valid data");
                }

                return this.productsMemoryCache;
            } catch (error) {
                console.error("Error fetching getProducts:", error);
                // Reset promise on error to allow future retries
                this.productsLoadingPromise = null;
                throw error;
            }
        })();

        return this.productsLoadingPromise;
    }
} 