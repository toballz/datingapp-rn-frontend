import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Animated, Linking, } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { namer, styles } from '../funcs/static';
import { __init__app, _handle_Signin, hostServer, screenWidth } from '../funcs/functions';
import { Loaderx } from '../funcs/functions_stateful';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CarouselRef, ControlledCarousel } from '../funcs/customCarousel';
import { Toastx } from '../funcs/customNotification';
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';

export const Auth_Login = () => {
  const navigation = useNavigation<any>();
  const carouselRef = useRef<CarouselRef>(null);
  const codeInputRefs = useRef<Array<TextInput | null>>([]);
  const resendAttemptRef = useRef(1);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('US');
  const [callingCode, setCallingCode] = useState('1');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [showCreateAccountPrompt, setShowCreateAccountPrompt] = useState(false);
  const [timer, setTimer] = useState(80);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isResendDisabled) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isResendDisabled]);

  const animatePageChange = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCountrySelect = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode?.[0] ?? '1');
  };

  const handleSendCode = async () => {
    Loaderx.show();
    await new Promise((res) => setTimeout(() => res(undefined), 1000));

    await _handle_Signin(phoneNumber, callingCode, null).then((htp) => {
      if (!htp) {
        Toastx.show({ type: 'error', message: 'Error signing in...' });
        return;
      }

      if (htp.code === 200) {
        carouselRef.current?.goToNext();
        return;
      }

      if (htp.code === 404) {
        setShowCreateAccountPrompt(true);
        return;
      }
      Toastx.show({ type: 'error', message: htp.message ?? htp.redirect ?? 'nothing' });
    })
      .finally(() => {
        Loaderx.hide();
      });
  };

  const applyCodeInput = (text: string, index: number) => {
    const digits = text.replace(/\D/g, '').split('');
    const next = [...verificationCode];

    if (digits.length > 0) {
      digits.slice(0, 6 - index).forEach((d, i) => {
        next[index + i] = d;
      });
      setVerificationCode(next);
      const focusTo = Math.min(index + digits.length, 5);
      codeInputRefs.current[focusTo]?.focus();
      return;
    }

    next[index] = '';
    setVerificationCode(next);
  };

  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendCode = async () => {
    await _handle_Signin(phoneNumber, callingCode, null);
    setTimer(90 * resendAttemptRef.current);
    resendAttemptRef.current += 1;
    setIsResendDisabled(true);
    Toastx.show({ type: 'info', message: 'Code resent' });
  };

  const handleVerifyAndContinue = async () => {
    const code = verificationCode.join('');
    if (code.length < 6) {
      Toastx.show({ type: 'error', message: 'Please enter the complete verification code!' });
      return;
    }

    Loaderx.show();
    await new Promise((res) => setTimeout(() => res(undefined), 1000));

    await _handle_Signin(phoneNumber, callingCode, code)
      .then(async (htp) => {
        if (!htp) {
          Toastx.show({ type: 'error', message: 'Error verifying account!' });
          return;
        }

        if (htp.code === 200) {
          await __init__app();
          Toastx.show({ type: 'success', message: htp.message ?? 'Verification successful!' });
          return;
        }

        if (htp.code === 301) {
          Toastx.show({ type: 'info', message: htp.message ?? 'Redirecting' });
          return;
        }

        Toastx.show({ type: 'error', message: htp.message ?? htp.redirect ?? 'nothing' });
      })
      .finally(() => {
        Loaderx.hide();
      });
  };
  const isValidPhoneNumberWithCode = () => {
    const phoneNumberObj = parsePhoneNumberFromString("+" + callingCode + phoneNumber);
    return phoneNumber.startsWith("000000") || (phoneNumberObj?.isValid() ?? false);
  };
  const renderLoginPage = () => (
    <Animated.View style={[
      stylesx.page,
      {
        justifyContent: 'center',
        opacity: fadeAnim,
        paddingHorizontal: 10,
        transform: [{ translateY: slideAnim }],
      },
    ]} >
      <View style={stylesx.header}>
        <Text style={stylesx.title}>Find Your Perfect Match</Text>
        <Text style={stylesx.subtitle}>Join millions finding love and connection</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={stylesx.inputContainer}>
          <View style={stylesx.countryPickerWrap}>
            <CountryPicker
              countryCode={countryCode}
              withFilter
              withFlag
              withCallingCode
              withCallingCodeButton
              withEmoji
              onSelect={handleCountrySelect}
              containerButtonStyle={stylesx.countryPickerButton}
            />
          </View>
          <TextInput style={stylesx.inputWithIcon}
            placeholder="Phone Number"
            placeholderTextColor="#999"
            value={phoneNumber}
            onChangeText={(e) => {
              const numbers = e.replace(/[^0-9]/g, '');
              setPhoneNumber(numbers);
            }}
            keyboardType="number-pad" />
        </View>

        <TouchableOpacity disabled={!isValidPhoneNumberWithCode()}
          style={[
            styles.pressableButton,
            !isValidPhoneNumberWithCode() && { backgroundColor: '#cccccc', opacity: 0.6 },
          ]}
          onPress={handleSendCode}>
          <Text style={styles.pressableButtonText}>Continue with Phone</Text>
        </TouchableOpacity>

        <View style={stylesx.orRow}>
          <View style={stylesx.orLine} />
          <Text style={stylesx.orText}>or continue with</Text>
          <View style={stylesx.orLine} />
        </View>

        <View style={stylesx.socialButtonsContainer}>
          <Pressable style={[stylesx.socialButton, { backgroundColor: '#db4437' }]} onPress={() => { }}>
            <MaterialCommunityIcons name="google" size={21} color="#fff" />
            <Text style={stylesx.socialButtonText}>Google</Text>
          </Pressable>

          <Pressable style={[stylesx.socialButton, { backgroundColor: '#4267B2' }]} onPress={() => { }}>
            <MaterialCommunityIcons name="facebook" size={21} color="#fff" />
            <Text style={stylesx.socialButtonText}>Facebook</Text>
          </Pressable>
        </View>

        {Platform.OS === 'ios' && (
          <Pressable style={[stylesx.socialButton, { backgroundColor: '#000', marginTop: 10 }]} onPress={() => { }}>
            <MaterialCommunityIcons name="apple" size={21} color="#fff" />
            <Text style={stylesx.socialButtonText}>Apple</Text>
          </Pressable>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={stylesx.termsText}>By continuing, you agree to our</Text>
          <Pressable onPress={() => Linking.openURL(hostServer() + '/static_page/tnc.php')}>
            <Text style={[stylesx.termsText, { color: '#5d5b8dff' }]}> Terms of Service</Text>
          </Pressable>
          <Text style={stylesx.termsText}> and</Text>
          <Pressable onPress={() => Linking.openURL(hostServer() + '/static_page/privacy.php')}>
            <Text style={[stylesx.termsText, { color: '#5d5b8dff' }]}> Privacy Policy.</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {showCreateAccountPrompt && (
        <View style={stylesx.promptBackdrop}>
          <View style={stylesx.promptCard}>
            <Text style={stylesx.promptTitle}>Account not found</Text>
            <Text style={stylesx.promptText}>+{callingCode} {phoneNumber}</Text>
            <Text style={stylesx.promptText}>We could not find an account for this number. Do you want to create one now?</Text>
            <View style={stylesx.promptActions}>
              <TouchableOpacity
                style={[stylesx.promptButton, stylesx.promptButtonCancel]}
                onPress={() => setShowCreateAccountPrompt(false)}
              >
                <Text style={stylesx.promptButtonCancelText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[stylesx.promptButton, stylesx.promptButtonPrimary]}
                onPress={() => {
                  setShowCreateAccountPrompt(false);
                  navigation.navigate(namer.navigation.signup);
                }}
              >
                <Text style={stylesx.promptButtonPrimaryText}>Create account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );

  const renderVerificationPage = () => {
    const maskedNumber = phoneNumber
      ? `+${callingCode} *****${phoneNumber.substring(Math.max(phoneNumber.length - 4, 0))}`
      : '';

    return (
      <Animated.View
        style={[
          stylesx.page,
          {
            justifyContent: 'center',
            opacity: fadeAnim,
            paddingHorizontal: 10,
            gap: 10,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={stylesx.heroCard}>
          <Text style={stylesx.heroTitle}>Verify your number</Text>
          <Text style={stylesx.heroSubtitle}>We sent a 6-digit code to {maskedNumber}</Text>
        </View>

        <View style={stylesx.prefCard}>
          <View style={stylesx.cardHeader}>
            <Text style={stylesx.cardTitle}>Enter code</Text>
          </View>

          <View style={stylesx.codeStack}>
            {verificationCode.map((digit, index) => {
              const isActive = !!digit;
              return (
                <TextInput
                  ref={(ref) => {
                    codeInputRefs.current[index] = ref;
                  }}
                  key={index}
                  style={[stylesx.codeInput, isActive && stylesx.codeInputActive]}
                  value={digit}
                  onChangeText={(text) => applyCodeInput(text, index)}
                  onKeyPress={(e) => handleCodeKeyPress(e, index)}
                  placeholder="0"
                  placeholderTextColor="#c4c4d3"
                  keyboardType="number-pad"
                  maxLength={6}
                  selectTextOnFocus
                  textContentType="oneTimeCode"
                />
              );
            })}
          </View>

          <View style={stylesx.codeFooter}>
            <Text style={stylesx.helperText}>{isResendDisabled ? 'Waiting to resend' : 'Did not get it?'}</Text>
            <TouchableOpacity
              style={[stylesx.pill, isResendDisabled && { opacity: 0.6 }]}
              disabled={isResendDisabled}
              onPress={handleResendCode}
            >
              <Text style={[stylesx.pillText, stylesx.pillTextActive]}>
                {isResendDisabled
                  ? `Resend in ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}`
                  : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.pressableButton} onPress={handleVerifyAndContinue}>
          <Text style={styles.pressableButtonText}>Verify & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            carouselRef.current?.goToPrevious();
            setVerificationCode(['', '', '', '', '', '']);
          }}
        >
          <Text style={stylesx.backButtonText}>Wrong number? Edit</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const pages = [renderLoginPage(), renderVerificationPage()];

  return (
    <SafeAreaView style={stylesx.container} edges={['bottom', 'top']}>
      <ControlledCarousel
        ref={carouselRef}
        pages={pages}
        onPageChange={() => {
          animatePageChange();
        }}
      />
    </SafeAreaView>
  );
};

const stylesx = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  page: {
    width: screenWidth,
    flex: 1,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputWithIcon: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  countryPickerWrap: {
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#d7dbe9',
    paddingRight: 8,
  },
  countryPickerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  orText: {
    color: '#666',
    fontWeight: '500',
    paddingHorizontal: 5,
    lineHeight: 13,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  socialButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
  promptBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  promptCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 18,
    borderWidth: 1,
    borderColor: '#ececf3',
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#222236',
  },
  promptText: {
    marginTop: 10,
    fontSize: 14,
    color: '#5a5a72',
    lineHeight: 20,
  },
  promptActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  promptButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptButtonCancel: {
    borderWidth: 1,
    borderColor: '#d9dbe8',
    backgroundColor: '#f9f9fc',
  },
  promptButtonPrimary: {
    backgroundColor: '#5d5b8d',
  },
  promptButtonCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4a4a63',
  },
  promptButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  heroCard: {
    backgroundColor: '#f5f4ff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e4e6ff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#222236',
    marginTop: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#5a5a72',
    marginTop: 6,
    lineHeight: 20,
  },
  prefCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ececf3',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c2b',
  },
  codeStack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  codeInput: {
    flex: 1,
    marginHorizontal: 4,
    height: 56,
    borderWidth: 1,
    borderColor: '#dcdced',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    backgroundColor: '#fafbff',
    color: '#1c1c2b',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  codeInputActive: {
    borderColor: '#5d5b8d',
    backgroundColor: '#f2f1ff',
  },
  codeFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helperText: {
    fontSize: 12,
    color: '#7a7a92',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f2f2fa',
    borderWidth: 1,
    borderColor: '#e3e4f3',
  },
  pillText: {
    color: '#4a4a63',
    fontWeight: '600',
    fontSize: 13,
  },
  pillTextActive: {
    color: '#2f2d6a',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
  },
});
