import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking, Alert, Share, TouchableOpacity, TextInput, Platform, Animated, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { sessionManager } from '../funcs/SessionContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { namer, styles } from '../funcs/static';
import { __init__app, _http_request, cacheStorage, hostServer, llStorage, logReport } from '../funcs/functions';
import appJson from '../../app.json';
import DeviceInfo from 'react-native-device-info';
import { SafeAreaView } from 'react-native-safe-area-context';
import IIcon from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Toastx } from '../funcs/customNotification';
import { CarouselRef, ControlledCarousel } from '../funcs/customCarousel';
import { bottomsheet_renderBackdrop } from '../funcs/functions_stateful';


// Modern color palette
const MODERN_COLORS = {
  primary: '#FF3B6B',
  secondary: '#6C63FF',
  accent: '#4ECDC4',
  background: '#F8F9FF',
  surface: '#FFFFFF',
  text: '#1F1F1F',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E8E9FF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  premium: '#FFD166',
  dark: '#121212',
  overlay: 'rgba(0, 0, 0, 0.5)',
};






export function Screen_settings({ navigation }: { navigation: any }) {
  const [getProfile, setProfile] = useState(cacheStorage.getCurrentUserProfile());

  const [getAllowOnlyVerified, setAllowOnlyVerified] = useState(getProfile?.messagefromonlyverified ?? false);
  const [getSnoozeAccount, setSnoozeAccount] = useState(getProfile?.snooze ?? false);
  const [privacyShowInDiscovery, setPrivacyShowInDiscovery] = useState(true);
  const [privacyShowLastActive, setPrivacyShowLastActive] = useState(true);
  const [privacyShowDistance, setPrivacyShowDistance] = useState(true);
  const [privacyAllowMessageRequests, setPrivacyAllowMessageRequests] = useState(true);
  const [notifyPushEnabled, setNotifyPushEnabled] = useState(true);
  const [notifyEmailEnabled, setNotifyEmailEnabled] = useState(true);

  const activeSubscription = getProfile?.user_effect?.has_active_subscription ?? false;
  const userSubscriptionStep1 = activeSubscription && getProfile?.user_effect?.subscription_plan === "plus";
  const userSubscriptionStep2 = activeSubscription && getProfile?.user_effect?.subscription_plan === "vip";

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.9], extrapolate: 'clamp' });

  // Use the correct ref type
  const bottomSheetRef_push = {
    ref: useRef<BottomSheet>(null),
    snap: useMemo(() => ['45%', '80%'], [])
  };
  const bottomSheetRef_feedback = {
    ref: useRef<BottomSheet>(null),
    snap: useMemo(() => ['35%', '75%'], [])
  };
  const bottomSheetRef_support = {
    ref: useRef<BottomSheet>(null),
    snap: useMemo(() => ['35%', '75%'], [])
  };
  const bottomSheetRef_payment = {
    ref: useRef<BottomSheet>(null),
    snap: useMemo(() => ['35%', '75%'], [])
  };
  const bottomSheetRef_debug = {
    ref: useRef<BottomSheet>(null),
    snap: useMemo(() => ['35%', '75%'], [])
  };
  const bottomSheetRef_email = {
    ref: useRef<BottomSheet>(null),
    snap: useMemo(() => ['35%', '75%'], [])
  };
  const bottomSheetRef_phone = {
    ref: useRef<BottomSheet>(null),
    snap: useMemo(() => ['35%', '75%'], [])
  };
  const bottomSheetRef_privacy = {
    ref: useRef<BottomSheet>(null),
    snap: useMemo(() => ['45%', '85%'], [])
  };

  const PRIVACY_STORAGE_KEY = 'privacy_settings_v1';
  const NOTIFICATION_STORAGE_KEY = 'notification_settings_v1';
  const privacyDefaults = {
    showInDiscovery: true,
    showLastActive: true,
    showDistance: true,
    allowMessageRequests: true,
  };
  const notificationDefaults = {
    pushEnabled: true,
    emailEnabled: true,
  };

  useEffect(() => {
    const loadPrivacySettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(PRIVACY_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setPrivacyShowInDiscovery(parsed?.showInDiscovery ?? privacyDefaults.showInDiscovery);
        setPrivacyShowLastActive(parsed?.showLastActive ?? privacyDefaults.showLastActive);
        setPrivacyShowDistance(parsed?.showDistance ?? privacyDefaults.showDistance);
        setPrivacyAllowMessageRequests(parsed?.allowMessageRequests ?? privacyDefaults.allowMessageRequests);
      } catch (err) {
        logReport({
          type: "function",
          useraction: "loadPrivacySettings",
          logMessage: "Failed to load privacy settings",
          stackTrace: err
        });
      }
    };
    const loadNotificationSettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setNotifyPushEnabled(parsed?.pushEnabled ?? notificationDefaults.pushEnabled);
        setNotifyEmailEnabled(parsed?.emailEnabled ?? notificationDefaults.emailEnabled);
      } catch (err) {
        logReport({
          type: "function",
          useraction: "loadNotificationSettings",
          logMessage: "Failed to load notification settings",
          stackTrace: err
        });
      }
    };
    loadPrivacySettings();
    loadNotificationSettings();
  }, []);

  const savePrivacySettings = async () => {
    try {
      await AsyncStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify({
        showInDiscovery: privacyShowInDiscovery,
        showLastActive: privacyShowLastActive,
        showDistance: privacyShowDistance,
        allowMessageRequests: privacyAllowMessageRequests,
      }));
      Toastx.show({ type: "success", message: "Privacy settings saved" });
      bottomSheetRef_privacy.ref.current?.close();
    } catch (err) {
      Toastx.show({ type: "error", message: "Failed to save privacy settings" });
      logReport({
        type: "function",
        useraction: "savePrivacySettings",
        logMessage: "Failed to save privacy settings",
        stackTrace: err
      });
    }
  };

  const resetPrivacySettings = async () => {
    setPrivacyShowInDiscovery(privacyDefaults.showInDiscovery);
    setPrivacyShowLastActive(privacyDefaults.showLastActive);
    setPrivacyShowDistance(privacyDefaults.showDistance);
    setPrivacyAllowMessageRequests(privacyDefaults.allowMessageRequests);
    try {
      await AsyncStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(privacyDefaults));
      Toastx.show({ type: "success", message: "Privacy settings reset" });
    } catch (err) {
      Toastx.show({ type: "error", message: "Failed to reset privacy settings" });
      logReport({
        type: "function",
        useraction: "resetPrivacySettings",
        logMessage: "Failed to reset privacy settings",
        stackTrace: err
      });
    }
  };

  const saveNotificationSettings = async () => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify({
        pushEnabled: notifyPushEnabled,
        emailEnabled: notifyEmailEnabled,
      }));
      Toastx.show({ type: "success", message: "Notification settings saved" });
      bottomSheetRef_push.ref.current?.close();
    } catch (err) {
      Toastx.show({ type: "error", message: "Failed to save notification settings" });
      logReport({
        type: "function",
        useraction: "saveNotificationSettings",
        logMessage: "Failed to save notification settings",
        stackTrace: err
      });
    }
  };

  const resetNotificationSettings = async () => {
    setNotifyPushEnabled(notificationDefaults.pushEnabled);
    setNotifyEmailEnabled(notificationDefaults.emailEnabled);
    try {
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notificationDefaults));
      Toastx.show({ type: "success", message: "Notification settings reset" });
    } catch (err) {
      Toastx.show({ type: "error", message: "Failed to reset notification settings" });
      logReport({
        type: "function",
        useraction: "resetNotificationSettings",
        logMessage: "Failed to reset notification settings",
        stackTrace: err
      });
    }
  };

  // Profile header with modern design
  const ProfileHeader = () => (
    <Animated.View style={[modernStyles.profileHeader, { opacity: headerOpacity }]}>
      <LinearGradient
        colors={['#FF3B6B', '#FF6B8B']}
        style={modernStyles.profileGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={modernStyles.profileInfo}>
          <View style={modernStyles.avatarContainer}>
            <View style={modernStyles.avatar}>
              <Text style={modernStyles.avatarText}>
                {getProfile?.user_name?.charAt(0) || 'U'}
              </Text>
            </View>
            {activeSubscription && (
              <View style={modernStyles.premiumBadge}>
                <Feather name="star" size={12} color="#FFF" />
              </View>
            )}
          </View>
          <View style={modernStyles.profileDetails}>
            <Text style={modernStyles.profileName}>{getProfile?.user_fullname || 'User'}</Text>


          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  // Modern card component
  const ModernCard = ({ children, style, gradient = false }: any) => (
    gradient ? (
      <LinearGradient
        colors={['#6C63FF', '#8B63FF']}
        style={[modernStyles.card, modernStyles.cardGradient, style]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {children}
      </LinearGradient>
    ) : (
      <View style={[modernStyles.card, style]}>
        {children}
      </View>
    )
  );

  // Modern option item
  const ModernOption = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    danger = false,
    premium = false
  }: any) => (
    <TouchableOpacity
      style={modernStyles.optionItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={modernStyles.optionLeft}>
        <View style={[
          modernStyles.optionIcon,
          danger && modernStyles.optionIconDanger,
          premium && modernStyles.optionIconPremium
        ]}>
          <IIcon
            name={icon}
            size={20}
            color={danger ? MODERN_COLORS.error : premium ? MODERN_COLORS.premium : MODERN_COLORS.primary}
          />
        </View>
        <View style={modernStyles.optionContent}>
          <Text style={[
            modernStyles.optionTitle,
            danger && modernStyles.optionTitleDanger
          ]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={modernStyles.optionSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightElement || (
        <IIcon name="chevron-forward" size={20} color={MODERN_COLORS.textTertiary} />
      )}
    </TouchableOpacity>
  );

  // Modern switch item
  const ModernSwitch = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
    premiumLock = false
  }: any) => (
    <View style={modernStyles.switchItem}>
      <View style={modernStyles.switchLeft}>
        <View style={modernStyles.switchIcon}>
          <IIcon name={icon} size={20} color={MODERN_COLORS.primary} />
        </View>
        <View style={modernStyles.switchContent}>
          <Text style={modernStyles.switchTitle}>{title}</Text>
          {subtitle && (
            <Text style={modernStyles.switchSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          if (premiumLock && !userSubscriptionStep2) {
            Toastx.show({
              type: "warning",
              message: "Upgrade to VIP to unlock this feature",
              duration: 3000
            });
          } else {
            onValueChange(!value);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={[
          modernStyles.switchTrack,
          value && modernStyles.switchTrackActive,
          premiumLock && !userSubscriptionStep2 && modernStyles.switchTrackDisabled
        ]}>
          <View style={[
            modernStyles.switchThumb,
            value && modernStyles.switchThumbActive
          ]} />
        </View>
      </TouchableOpacity>
    </View>
  );

  // Modern section header
  const ModernSection = ({ title, icon, children }: any) => (
    <View style={modernStyles.section}>
      <View style={modernStyles.sectionHeader}>
        <View style={modernStyles.sectionIcon}>
          <IIcon name={icon} size={18} color={MODERN_COLORS.primary} />
        </View>
        <Text style={modernStyles.sectionTitle}>{title}</Text>
      </View>
      <ModernCard>
        {children}
      </ModernCard>
    </View>
  );

  // Quick actions bar
  const QuickActions = () => (
    <View style={modernStyles.quickActions}>
      <TouchableOpacity
        style={modernStyles.quickAction}
        onPress={() => bottomSheetRef_support.ref.current?.expand()}
      >
        <LinearGradient
          colors={['#6C63FF', '#8B63FF']}
          style={modernStyles.quickActionIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="help-circle" size={20} color="#FFF" />
        </LinearGradient>
        <Text style={modernStyles.quickActionText}>Support</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={modernStyles.quickAction}
        onPress={() => bottomSheetRef_feedback.ref.current?.expand()}
      >
        <LinearGradient
          colors={['#34C759', '#4CD964']}
          style={modernStyles.quickActionIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="message-square" size={20} color="#FFF" />
        </LinearGradient>
        <Text style={modernStyles.quickActionText}>Feedback</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={modernStyles.quickAction}
        onPress={async () => {
          await Share.share({
            title: `Join me on ${appJson?.displayName}!`,
            message: `I'm using ${appJson?.displayName} to meet amazing people. Join me!`,
          });
        }}
      >
        <LinearGradient
          colors={['#FF3B6B', '#FF6B8B']}
          style={modernStyles.quickActionIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="share-2" size={20} color="#FFF" />
        </LinearGradient>
        <Text style={modernStyles.quickActionText}>Share</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={modernStyles.quickAction}
        onPress={() => bottomSheetRef_payment.ref.current?.expand()}
      >
        <LinearGradient
          colors={['#FFD166', '#FFB347']}
          style={modernStyles.quickActionIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="crown" size={20} color="#FFF" />
        </LinearGradient>
        <Text style={modernStyles.quickActionText}>Premium</Text>
      </TouchableOpacity>
    </View>
  );


  // Email Change Flow Component
  const EmailChangeFlow = ({ currentEmail, onComplete, onCancel }: { currentEmail: string, onComplete: () => void, onCancel: () => void }) => {
    const [step, setStep] = useState(0);
    const [newEmail, setNewEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const carouselRef = useRef<CarouselRef>(null);

    const steps = [
      {
        title: "Change Email",
        subtitle: "Enter your new email address",
        content: (
          <View style={modernStyles.flowContainer}>
            <View style={modernStyles.currentInfo}>
              <Text style={modernStyles.currentLabel}>Current Email</Text>
              <Text style={modernStyles.currentValue}>{currentEmail}</Text>
            </View>

            <View style={modernStyles.inputGroup}>
              <Text style={modernStyles.inputLabel}>New Email Address</Text>
              <TextInput
                style={modernStyles.input}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none" multiline
                value={newEmail}
                onChangeText={(text) => {
                  setNewEmail(text);
                  setError('');
                }}
                editable={!isLoading}
              />
            </View>

            {error ? <Text style={modernStyles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                modernStyles.primaryButton,
                (!newEmail || isLoading) && modernStyles.buttonDisabled
              ]}
              onPress={async () => {
                if (!newEmail || newEmail === currentEmail) {
                  setError("Please enter a different email address");
                  return;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(newEmail)) {
                  setError("Please enter a valid email address");
                  return;
                }

                setIsLoading(true);
                setError('');

                try {
                  const response = await _http_request({
                    customApiUrl: hostServer() + "/api/core/v1/pushNewEmail",
                    reqType: 'POST',
                    bodyArray: {
                      oldemail: currentEmail,
                      newemail: newEmail,
                      rnc: "1",
                    }
                  });

                  if (response?.code === 200) {
                    setSuccessMessage("Verification code sent to your new email");
                    carouselRef.current?.goToNext();
                  } else {
                    setError(response?.message || "Failed to send verification");
                  }
                } catch (err) {
                  setError("Network error. Please try again.");
                  logReport({
                    type: "function",
                    useraction: "pushNewEmail",
                    logMessage: "Network error during email change",
                    stackTrace: err
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={!newEmail || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={modernStyles.primaryButtonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={modernStyles.secondaryButton}
              onPress={onCancel}
            >
              <Text style={modernStyles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )
      },
      {
        title: "Verify Email",
        subtitle: "Enter the 6-digit code sent to your new email",
        content: (
          <View style={modernStyles.flowContainer}>
            <View style={modernStyles.infoBox}>
              <IIcon name="mail-outline" size={24} color={MODERN_COLORS.primary} />
              <Text style={modernStyles.infoText}>
                Code sent to: <Text style={{ fontWeight: 'bold' }}>{newEmail}</Text>
              </Text>
            </View>

            <View style={modernStyles.inputGroup}>
              <Text style={modernStyles.inputLabel}>Verification Code</Text>
              <TextInput
                style={modernStyles.input}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                value={verificationCode}
                onChangeText={(text) => {
                  setVerificationCode(text.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={modernStyles.resendButton}
              onPress={async () => {
                setIsLoading(true);
                try {
                  const response = await _http_request({
                    customApiUrl: hostServer() + "/api/core/v1/pushNewEmail",
                    reqType: 'POST',
                    bodyArray: {
                      oldemail: currentEmail,
                      newemail: newEmail,
                      rnc: "1",
                    }
                  });

                  if (response?.code === 200) {
                    Toastx.show({ type: "success", message: "New code sent!" });
                  }
                } catch (err) {
                  Toastx.show({ type: "error", message: "Failed to resend code" });
                  logReport({
                    type: "function",
                    useraction: "resendEmailVerificationCode",
                    logMessage: "Failed to resend email verification code",
                    stackTrace: err
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              <Text style={modernStyles.resendButtonText}>Resend Code</Text>
            </TouchableOpacity>

            {error ? <Text style={modernStyles.errorText}>{error}</Text> : null}
            {successMessage ? <Text style={modernStyles.successText}>{successMessage}</Text> : null}

            <View style={modernStyles.buttonRow}>
              <TouchableOpacity
                style={[modernStyles.secondaryButton, { flex: 1 }]}
                onPress={() => carouselRef.current?.goToPrevious()}
              >
                <Text style={modernStyles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  modernStyles.primaryButton,
                  { flex: 1 },
                  (verificationCode.length !== 6 || isLoading) && modernStyles.buttonDisabled
                ]}
                onPress={async () => {
                  if (verificationCode.length !== 6) {
                    setError("Please enter a valid 6-digit code");
                    return;
                  }

                  setIsLoading(true);
                  try {
                    const response = await _http_request({
                      customApiUrl: hostServer() + "/api/core/v1/pushNewEmail",
                      reqType: 'POST',
                      bodyArray: {
                        oldemail: currentEmail,
                        newemail: newEmail,
                        vcode: verificationCode,
                      }
                    });

                    if (response?.code === 200) {
                      Toastx.show({
                        type: "success",
                        message: "Email updated successfully!"
                      });
                      onComplete();
                    } else {
                      setError(response?.message || "Invalid verification code");
                    }
                  } catch (err) {
                    setError("Network error. Please try again.");
                    logReport({
                      type: "function",
                      useraction: "updateEmail",
                      logMessage: "Network error during email update",
                      stackTrace: err
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={verificationCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={modernStyles.primaryButtonText}>Verify & Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )
      }
    ];
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} >
        <ControlledCarousel ref={carouselRef} initialPage={0} onPageChange={setStep}
          pages={steps.map((stepConfig, index) => (
            <View key={index} style={{ flex: 1, paddingHorizontal: 10 }}>
              <View style={modernStyles.flowHeader}>
                <Text style={modernStyles.flowTitle}>{stepConfig.title}</Text>
                <Text style={modernStyles.flowSubtitle}>{stepConfig.subtitle}</Text>
              </View>
              {stepConfig.content}
            </View>
          ))} />

        <View style={modernStyles.stepIndicator}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                modernStyles.stepDot,
                index === step && modernStyles.stepDotActive
              ]}
            />
          ))}
        </View>
      </KeyboardAvoidingView>
    );
  };

  // Phone Change Flow Component (similar structure, but for phone)
  const PhoneChangeFlow = ({
    currentPhone,
    onComplete,
    onCancel
  }: {
    currentPhone: string,
    onComplete: () => void,
    onCancel: () => void
  }) => {
    const [step, setStep] = useState(0);
    const [newPhone, setNewPhone] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const carouselRef = useRef<CarouselRef>(null);

    const steps = [
      {
        title: "Change Phone",
        subtitle: "Enter your new phone number",
        content: (
          <View style={modernStyles.flowContainer}>
            <View style={modernStyles.currentInfo}>
              <Text style={modernStyles.currentLabel}>Current Phone</Text>
              <Text style={modernStyles.currentValue}>{currentPhone}</Text>
            </View>

            <View style={modernStyles.inputGroup}>
              <Text style={modernStyles.inputLabel}>New Phone Number</Text>
              <TextInput
                style={modernStyles.input}
                placeholder="+1 555 000 0000"
                keyboardType="phone-pad"
                autoCapitalize="none"
                value={newPhone}
                onChangeText={(text) => {
                  setNewPhone(text);
                  setError('');
                }}
                editable={!isLoading}
              />
            </View>

            {error ? <Text style={modernStyles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                modernStyles.primaryButton,
                (!newPhone || isLoading) && modernStyles.buttonDisabled
              ]}
              onPress={async () => {

                const trimmedPhone = newPhone.trim();
                if (!trimmedPhone || trimmedPhone === currentPhone) {
                  setError("Please enter a different phone number");
                  return;
                }

                setIsLoading(true);
                setError('');

                try {
                  const response = await _http_request({
                    customApiUrl: hostServer() + "/api/core/v1/pushNewPhonenumber",
                    reqType: 'POST',
                    bodyArray: {
                      oldpnumber: currentPhone,
                      newpnumber: trimmedPhone,
                      rnc: "1",
                    }
                  });

                  if (response?.code === 200) {
                    setSuccessMessage("Verification code sent to your new phone");
                    carouselRef.current?.goToNext();
                  } else {
                    setError(response?.message || "Failed to send verification");
                  }
                } catch (err) {
                  setError("Network error. Please try again.");
                  logReport({
                    type: "function",
                    useraction: "pushNewPhonenumber",
                    logMessage: "Network error during phone number change",
                    stackTrace: err
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={!newPhone || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={modernStyles.primaryButtonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={modernStyles.secondaryButton}
              onPress={onCancel}
            >
              <Text style={modernStyles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )
      },
      {
        title: "Verify Phone",
        subtitle: "Enter the 6-digit code sent to your new phone",
        content: (
          <View style={modernStyles.flowContainer}>
            <View style={modernStyles.infoBox}>
              <IIcon name="call-outline" size={24} color={MODERN_COLORS.primary} />
              <Text style={modernStyles.infoText}>
                Code sent to: <Text style={{ fontWeight: 'bold' }}>{newPhone}</Text>
              </Text>
            </View>

            <View style={modernStyles.inputGroup}>
              <Text style={modernStyles.inputLabel}>Verification Code</Text>
              <TextInput
                style={modernStyles.input}
                placeholder="Enter 6-digit code"
                keyboardType="number-pad"
                maxLength={6}
                value={verificationCode}
                onChangeText={(text) => {
                  setVerificationCode(text.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={modernStyles.resendButton}
              onPress={async () => {

                setIsLoading(true);
                try {
                  const response = await _http_request({
                    customApiUrl: hostServer() + "/api/core/v1/pushNewPhonenumber",
                    reqType: 'POST',
                    bodyArray: {
                      oldpnumber: currentPhone,
                      newpnumber: newPhone.trim(),
                      rnc: "1",
                    }
                  });

                  if (response?.code === 200) {
                    Toastx.show({ type: "success", message: "New code sent!" });
                  }
                } catch (err) {
                  Toastx.show({ type: "error", message: "Failed to resend code" });
                  logReport({
                    type: "function",
                    useraction: "resendPhoneVerificationCode",
                    logMessage: "Failed to resend phone verification code",
                    stackTrace: err
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              <Text style={modernStyles.resendButtonText}>Resend Code</Text>
            </TouchableOpacity>

            {error ? <Text style={modernStyles.errorText}>{error}</Text> : null}
            {successMessage ? <Text style={modernStyles.successText}>{successMessage}</Text> : null}

            <View style={modernStyles.buttonRow}>
              <TouchableOpacity
                style={[modernStyles.secondaryButton, { flex: 1 }]}
                onPress={() => carouselRef.current?.goToPrevious()}
              >
                <Text style={modernStyles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  modernStyles.primaryButton,
                  { flex: 1 },
                  (verificationCode.length !== 6 || isLoading) && modernStyles.buttonDisabled
                ]}
                onPress={async () => {

                  if (verificationCode.length !== 6) {
                    setError("Please enter a valid 6-digit code");
                    return;
                  }

                  setIsLoading(true);
                  try {
                    const response = await _http_request({
                      customApiUrl: hostServer() + "/api/core/v1/pushNewPhonenumber",
                      reqType: 'POST',
                      bodyArray: {
                        oldpnumber: currentPhone,
                        newpnumber: newPhone.trim(),
                        vcode: verificationCode,
                      }
                    });

                    if (response?.code === 200) {
                      Toastx.show({
                        type: "success",
                        message: "Phone number updated successfully!"
                      });
                      onComplete();
                    } else {
                      setError(response?.message || "Invalid verification code");
                    }
                  } catch (err) {
                    setError("Network error. Please try again.");
                    logReport({
                      type: "function",
                      useraction: "updatePhone",
                      logMessage: "Network error during phone update",
                      stackTrace: err
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={verificationCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={modernStyles.primaryButtonText}>Verify & Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )
      }
    ];

    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} >
        <ControlledCarousel ref={carouselRef} initialPage={0} onPageChange={setStep}
          pages={steps.map((stepConfig, index) => (
            <View key={index} style={{ flex: 1, paddingHorizontal: 10 }}>
              <View style={modernStyles.flowHeader}>
                <Text style={modernStyles.flowTitle}>{stepConfig.title}</Text>
                <Text style={modernStyles.flowSubtitle}>{stepConfig.subtitle}</Text>
              </View>
              {stepConfig.content}
            </View>
          ))} />

        <View style={modernStyles.stepIndicator}>
          {steps.map((_, index) => (
            <View key={index} style={[modernStyles.stepDot, index === step && modernStyles.stepDotActive]} />
          ))}
        </View>
      </KeyboardAvoidingView>
    );
  };





  // FIXED: All onPress handlers now properly reference the refs
  return (<>
      <SafeAreaView style={modernStyles.container} edges={["bottom"]}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          <ProfileHeader />

          <View style={[styles.container, { paddingBottom: 30, backgroundColor: MODERN_COLORS.background }]}>
            {/* Quick Actions */}
            <QuickActions />

            {/* Account Settings Section */}
            <ModernSection title="Account" icon="person-outline">
              <ModernOption
                icon="mail-outline"
                title="Email Address"
                subtitle={getProfile?.user_email}
                onPress={() => {
                  bottomSheetRef_email.ref.current?.expand();
                }}
              />
              <ModernOption
                icon="call-outline"
                title="Phone Number"
                subtitle={getProfile?.user_phonenumber}
                onPress={() => {
                  bottomSheetRef_phone.ref.current?.expand();
                }}
              />
              <ModernOption
                icon="notifications-outline"
                title="Push Notifications"
                subtitle="Manage alerts and preferences"
                onPress={() => {
                  bottomSheetRef_push.ref.current?.expand();

                }}
              />
            </ModernSection>

            {/* Discovery & Preferences Section */}
            <ModernSection title="Discovery" icon="compass-outline">
              <ModernSwitch
                icon="shield-checkmark-outline"
                title="Verified Users Only"
                subtitle="Only receive messages from verified accounts"
                value={getAllowOnlyVerified}
                onValueChange={setAllowOnlyVerified}
                premiumLock={!userSubscriptionStep2}
              />
              <ModernSwitch
                icon="moon-outline"
                title="Snooze Dating"
                subtitle="Temporarily hide your profile"
                value={getSnoozeAccount}
                onValueChange={setSnoozeAccount}
              />
            </ModernSection>

            {/* Privacy & Safety Section */}
            <ModernSection title="Privacy & Safety" icon="shield-outline">
              <ModernOption
                icon="lock-closed-outline"
                title="Privacy Settings"
                subtitle="Control who sees your profile"
                onPress={() => bottomSheetRef_privacy.ref.current?.expand()}
              />
              <ModernOption
                icon="flag-outline"
                title="Blocked Users"
                subtitle="Manage your block list"
                onPress={() => Toastx.show({ type: "info", message: "Blocked users list coming soon!" })}
              />
              <ModernOption
                icon="warning-outline"
                title="Safety Center"
                subtitle="Learn about dating safely"
                onPress={() => Linking.openURL(hostServer() + "/static_page/tnc.php")}
                rightElement={<IIcon size={20} name='open-outline' />}
              />
            </ModernSection>

            {/* Legal Section */}
            <ModernSection title="Legal" icon="document-text-outline">
              <ModernOption
                icon="reader-outline"
                title="Terms of Service"
                onPress={() => Linking.openURL(hostServer() + "/static_page/tnc.php")}
                rightElement={<IIcon size={20} name='open-outline' />}
              />
              <ModernOption
                icon="shield-checkmark-outline"
                title="Privacy Policy"
                onPress={() => Linking.openURL(hostServer() + "/static_page/privacy.php")}
                rightElement={<IIcon size={20} name='open-outline' />}
              />
            </ModernSection>



            {/* Logout & Delete Section */}
            <View style={modernStyles.dangerSection}>
              <ModernCard>
                <ModernOption
                  icon="log-out-outline"
                  title="Log Out"
                  onPress={async () => {
                    await AsyncStorage.removeItem(namer.storage.sessionId);
                    sessionManager.updateSession({ x_omi_payload: null, x_omi_payload_hash: null });
                    navigation.canGoBack() ? navigation.goBack() : null;
                  }}
                  danger
                />
              </ModernCard>
              <Pressable onPress={() => {
                Alert.alert(
                  "Delete Account?",
                  "This action cannot be undone. All your data will be permanently deleted.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        Toastx.show({ type: "error", message: "Account deletion requested" });
                      }
                    },
                  ]
                );
              }} style={{ alignSelf: "flex-start" }}><Text style={{ color: "#ff7a7aff", marginTop: 20, fontSize: 12 }}>delete account</Text></Pressable>
            </View>


            {/* Developer Options (Hidden unless enabled) */}
            <ModernOption icon="code-slash-outline" title="Debug Tools"
              onPress={() => navigation.push("zz_devv")} />


            {/* App Version */}
            <View style={modernStyles.versionContainer}>
              <Text style={modernStyles.versionText}> dv-{DeviceInfo.getVersion()} (jv-{appJson?.appversion})</Text>
              <Text style={modernStyles.buildText}>
                Build {DeviceInfo.getBuildNumber()} • Bundle {appJson?.bundlebuildnumber}
              </Text>
            </View>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>

      {/* Custom Bottom Sheets */}

      <BottomSheet ref={bottomSheetRef_email.ref} enablePanDownToClose index={-1}
        snapPoints={bottomSheetRef_email.snap}
        backdropComponent={bottomsheet_renderBackdrop}>
        <BottomSheetView >
          <EmailChangeFlow currentEmail={getProfile?.user_email || ''}
            onCancel={() => bottomSheetRef_email.ref.current?.close()}
            onComplete={async () => {
              // Refresh profile data
              await __init__app();
              bottomSheetRef_email.ref.current?.close();
              setProfile(cacheStorage.getCurrentUserProfile());

            }} />
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet ref={bottomSheetRef_phone.ref} enablePanDownToClose index={-1}
        snapPoints={bottomSheetRef_phone.snap}
        backdropComponent={bottomsheet_renderBackdrop} >
        <BottomSheetView>
          <PhoneChangeFlow currentPhone={getProfile?.user_phonenumber || ''}
            onComplete={async () => {
              // Refresh profile data
              await __init__app();
              bottomSheetRef_phone.ref.current?.close();
              setProfile(cacheStorage.getCurrentUserProfile());
            }}
            onCancel={() => bottomSheetRef_phone.ref.current?.close()} />
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet ref={bottomSheetRef_privacy.ref} index={-1} enablePanDownToClose
        snapPoints={bottomSheetRef_privacy.snap}
        backdropComponent={bottomsheet_renderBackdrop} >
        <BottomSheetView >
          <View style={{ flex: 1 }}>
            <Text style={modernStyles.sectionTitle}>Privacy Settings</Text>
            <Text style={[modernStyles.optionSubtitle, { marginTop: 6 }]}>
              Choose what other people can see on your profile.
            </Text>

            <View style={{ marginTop: 16 }}>
              <ModernSwitch
                icon="compass-outline"
                title="Show me in discovery"
                subtitle="Hide your profile from new people"
                value={privacyShowInDiscovery}
                onValueChange={setPrivacyShowInDiscovery}
              />
              <ModernSwitch
                icon="time-outline"
                title="Show last active"
                subtitle="Let matches see when you were last online"
                value={privacyShowLastActive}
                onValueChange={setPrivacyShowLastActive}
              />
              <ModernSwitch
                icon="location-outline"
                title="Show distance"
                subtitle="Display your distance on your profile"
                value={privacyShowDistance}
                onValueChange={setPrivacyShowDistance}
              />
              <ModernSwitch
                icon="chatbubble-ellipses-outline"
                title="Allow message requests"
                subtitle="People can message you before matching"
                value={privacyAllowMessageRequests}
                onValueChange={setPrivacyAllowMessageRequests}
              />
            </View>

            <TouchableOpacity
              style={[modernStyles.secondaryButton, { marginTop: 12 }]}
              onPress={() => {
                Alert.alert(
                  "Download Data",
                  "Your data will be prepared and sent to your email. This may take a few minutes.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Request Download",
                      onPress: () => {
                        Toastx.show({
                          type: "success",
                          message: "Data download requested. You'll receive an email when it's ready."
                        });
                      }
                    },
                  ]
                );
              }}
            >
              <Text style={modernStyles.secondaryButtonText}>Download Your Data</Text>
            </TouchableOpacity>

            <View style={[modernStyles.buttonRow, { marginTop: 18 }]}>
              <TouchableOpacity
                style={[modernStyles.secondaryButton, { flex: 1 }]}
                onPress={resetPrivacySettings}
              >
                <Text style={modernStyles.secondaryButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modernStyles.primaryButton, { flex: 1 }]}
                onPress={savePrivacySettings}
              >
                <Text style={modernStyles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet ref={bottomSheetRef_push.ref} index={-1} enablePanDownToClose
        snapPoints={bottomSheetRef_push.snap}
        backdropComponent={bottomsheet_renderBackdrop} >
        <BottomSheetView style={{ padding: 23 }}>
          <View style={{ flex: 1 }}>
            <Text style={modernStyles.sectionTitle}>Push Notifications</Text>
            <Text style={[modernStyles.optionSubtitle, { marginTop: 6 }]}>
              Choose how you receive updates and alerts.
            </Text>

            <View style={{ marginTop: 16 }}>
              <ModernSwitch
                icon="notifications-outline"
                title="Push notifications"
                subtitle="Allow alerts on your device"
                value={notifyPushEnabled}
                onValueChange={setNotifyPushEnabled}
              />
              <ModernSwitch
                icon="mail-outline"
                title="Email notifications"
                subtitle="Receive updates by email"
                value={notifyEmailEnabled}
                onValueChange={setNotifyEmailEnabled}
              />
            </View>

            <View style={[modernStyles.buttonRow, { marginTop: 18 }]}>
              <TouchableOpacity
                style={[modernStyles.secondaryButton, { flex: 1 }]}
                onPress={resetNotificationSettings}
              >
                <Text style={modernStyles.secondaryButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modernStyles.primaryButton, { flex: 1 }]}
                onPress={saveNotificationSettings}
              >
                <Text style={modernStyles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet
        ref={bottomSheetRef_payment.ref}
        index={-1}
        snapPoints={bottomSheetRef_payment.snap}
        backdropComponent={bottomsheet_renderBackdrop}
        enablePanDownToClose
      >
        <BottomSheetView style={{ padding: 23 }}>
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <Text style={modernStyles.sectionTitle}>Payments</Text>
            {/* Add payment content here */}
          </View>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet
        ref={bottomSheetRef_feedback.ref}
        index={-1}
        snapPoints={bottomSheetRef_feedback.snap}
        backdropComponent={bottomsheet_renderBackdrop}
        enablePanDownToClose
      >
        <BottomSheetView style={{ padding: 23 }}>
          <View style={{ flex: 1 }}>
            <Text style={modernStyles.sectionTitle}>Feedback</Text>
            {/* Add feedback content here */}
          </View>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet
        ref={bottomSheetRef_support.ref}
        index={-1}
        snapPoints={bottomSheetRef_support.snap}
        backdropComponent={bottomsheet_renderBackdrop}
        enablePanDownToClose
      >
        <BottomSheetView style={{ padding: 23 }}>
          <View style={{ flex: 1 }}>
            <Text style={modernStyles.sectionTitle}>Support</Text>
            {/* Add support content here */}
          </View>
        </BottomSheetView>
      </BottomSheet>
    </>
  );
}

// Modern Styles
const modernStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MODERN_COLORS.background,
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  profileGradient: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: MODERN_COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  flowContainer: {
    gap: 20,
  },
  flowHeader: {
    marginBottom: 24,
  },
  flowTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: MODERN_COLORS.text,
    marginBottom: 8,
  },
  flowSubtitle: {
    fontSize: 16,
    color: MODERN_COLORS.textSecondary,
  },
  currentInfo: {
    backgroundColor: MODERN_COLORS.border,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  currentLabel: {
    fontSize: 12,
    color: MODERN_COLORS.textSecondary,
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: MODERN_COLORS.text,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: MODERN_COLORS.text,
  },
  input: {
    backgroundColor: MODERN_COLORS.surface,
    borderWidth: 1,
    borderColor: MODERN_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: MODERN_COLORS.text,
  },
  primaryButton: {
    backgroundColor: MODERN_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: MODERN_COLORS.surface,
    borderWidth: 1,
    borderColor: MODERN_COLORS.border,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: MODERN_COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: MODERN_COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  successText: {
    color: MODERN_COLORS.success,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: MODERN_COLORS.border,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: MODERN_COLORS.text,
    flex: 1,
  },
  resendButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    color: MODERN_COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MODERN_COLORS.border,
  },
  stepDotActive: {
    backgroundColor: MODERN_COLORS.primary,
    width: 12,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: MODERN_COLORS.premium,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: MODERN_COLORS.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MODERN_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: MODERN_COLORS.text,
  },
  card: {
    backgroundColor: MODERN_COLORS.surface,
    borderRadius: 18,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: MODERN_COLORS.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardGradient: {
    borderWidth: 0,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MODERN_COLORS.border,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: MODERN_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionIconDanger: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  optionIconPremium: {
    backgroundColor: 'rgba(255, 209, 102, 0.1)',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: MODERN_COLORS.text,
    marginBottom: 2,
  },
  optionTitleDanger: {
    color: MODERN_COLORS.error,
  },
  optionSubtitle: {
    fontSize: 13,
    color: MODERN_COLORS.textSecondary,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: MODERN_COLORS.border,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: MODERN_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  switchContent: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: MODERN_COLORS.text,
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: 13,
    color: MODERN_COLORS.textSecondary,
  },
  switchTrack: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: MODERN_COLORS.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: MODERN_COLORS.primary,
  },
  switchTrackDisabled: {
    backgroundColor: MODERN_COLORS.textTertiary,
  },
  switchThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MODERN_COLORS.surface,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  dangerSection: {
    marginTop: 8,
    marginBottom: 32,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 14,
    color: MODERN_COLORS.textSecondary,
    marginBottom: 4,
  },
  buildText: {
    fontSize: 11,
    color: MODERN_COLORS.textTertiary,
  },
});

export default Screen_settings;
