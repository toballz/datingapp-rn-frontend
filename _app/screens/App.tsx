import React, { useEffect, useState } from 'react';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStackNavigator } from '@react-navigation/stack';
import IIcon from 'react-native-vector-icons/Ionicons';
import MIcon from "react-native-vector-icons/MaterialCommunityIcons";

import { Peoples_Screen } from './Peoples';
import { Screen_likes } from './Likes';
import { Screen_chat } from './Chats';
import { Screen_profile } from './Profile';
import { Screen_conversation } from './Conversations';
import { Auth_InputPhoneNumberPage } from './Authenticater';
import { Loaderx } from '../funcs/functions_stateful';
import { Screen_settings } from './Settings';
import { Screen_editprofile } from './ProfileEdit';
import { sessionManager, SessionTypes } from '../funcs/SessionContext';
import { Screen_editpreference } from './PreferenceEdit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Zz_nofilee } from './zz_nofilee';
import { namer, resourceMap } from '../funcs/static';
import { Screen_Subscribe } from './Subscribe';
import { __init__app, convoHelper, displsyNotification, llStorage, logReport } from '../funcs/functions';
import { SocketClient } from '../funcs/socket_realtimeData';
import { AppState, Text, Vibration, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import QuickActions from 'react-native-quick-actions';
import { Toastx } from '../funcs/customNotification';
import { Screen_social } from './Social';
import { Screen_Coin } from './Coin';
import LottieView from 'lottie-react-native';

// Type definitions for props if needed
const Stack = createStackNavigator<any>();
const TabBottom = createBottomTabNavigator<any>();
const navigationRef = createNavigationContainerRef<any>();

const MainApp: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<SessionTypes | null>(sessionManager.getCurrentSession());
  const [getAllGood, setAllGood] = useState(false);

  // Handle deep linking to Settings screen
  useEffect(() => {
    let navTimeout: ReturnType<typeof setTimeout> | null = null;  // store timeout ID so we can destroy it

    QuickActions.popInitialAction().then(action => {
      console.log("Quick Action:", action);
      const tryNavigate = () => {
        if (navigationRef.isReady()) {
          Toastx.show({ message: 'Navigating to Settings...', type: 'info' });
          navigationRef.navigate(namer.navigation.settings);

          // DESTROY timeout once navigation happens
          if (navTimeout) clearTimeout(navTimeout);
          return;
        } else {
          navTimeout = setTimeout(tryNavigate, 50);
        }
      };
      if (action?.type === 'setting-settings') {
        tryNavigate();

      }
    });
    // CLEANUP ON UNMOUNT (VERY IMPORTANT)
    return () => {
      if (navTimeout) clearTimeout(navTimeout);
    };
  }, []);


  // Handle session subscription
  useEffect(() => {
    const unsubscribe = sessionManager.subscribe((newSession) => { setCurrentSession(newSession); });
    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  // Fetch initial data
  useEffect(() => {
    //let socketListen: Function = () => { };
    const initializeApp = async () => {
      try {
        setAllGood(false);
        // Reset session and fetch mapper data
        await sessionManager.updateSession({ x_omi_payload: null, x_omi_payload_hash: null });
        const sessIdStorage = await AsyncStorage.getItem(namer.storage.sessionId);
        const sessIdVerifyStorage = await AsyncStorage.getItem(namer.storage.sessionIdVerify);
        if (sessIdStorage !== null) {
          await sessionManager.updateSession({ x_omi_payload: sessIdStorage, x_omi_payload_hash: sessIdVerifyStorage });
        }
      } catch (error: any) {
        logReport({
          type: "function",
          extra: error?.message || String(error),
          useraction: 'initializeApp',
          logMessage: error?.message || String(error),
          stackTrace: error
        });
        Toastx.show({ message: 'Error initializing app', type: 'error', duration: 9000 });
      }
    };


    initializeApp().then(async () => {
      await __init__app().then(() => {
        const userId = llStorage.currentProfile.get()?.currentUser?.user_id;

        if (!userId) return;
        SocketClient.connect(userId, (data) => {
          const matchId = convoHelper.matchId.get();
          const retrivedData = data?.message;
          if (data.event === 'message') {
            if (retrivedData?.type !== "single-convo") return;
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
              if (navigationRef.isReady()) {
                navigationRef.setParams({ realtimedata: retrivedData?.payload });
              }
            } else {
              const nmessage = (retrivedData?.payload?.firstName ?? "Someone") + " has messaged you";
              if (AppState.currentState === 'active') {
                Vibration.vibrate(100);
                Toastx.show({
                  title: nmessage,
                  message: "Tap to view message",
                  type: 'info',
                  onPress: () => {
                    if (navigationRef.isReady()) {
                      navigationRef.navigate(namer.navigation.conversation, { matchId: retrivedData?.matchId });
                    }
                  }
                });
              } else if (AppState.currentState === 'background' || AppState.currentState === 'inactive') {
                displsyNotification(nmessage, "Tap to view message");
              }
            }
          }
        });
      });

    }).finally(() => {
      setAllGood(true);
    });
    return () => {
      SocketClient.disconnect();
    }
  }, []); // Runs only once on mount




  const BottomTabNavigator = () => (
    <TabBottom.Navigator initialRouteName={namer.navigation.peoples}>

      <TabBottom.Screen name={namer.navigation.likes} component={Screen_likes}
        options={{
          headerTransparent: true,
          tabBarIcon: () => <IIcon name="heart-half-outline" size={32} color="#4F8EF7" />
        }} />
      <TabBottom.Screen name={namer.navigation.chat} component={Screen_chat}
        options={{
          headerTransparent: true,
          tabBarIcon: () => <IIcon name="chatbubble-ellipses-outline" size={30} color="#4F8EF7" />,
          headerTitleAlign: 'center',
        }} />
      <TabBottom.Screen name={namer.navigation.peoples} component={Peoples_Screen}
        options={{
          tabBarIcon: () => <MIcon name="cards-outline" size={30} color="#4F8EF7" />,
        }} />

      <TabBottom.Screen name={namer.navigation.social} component={Screen_social}
        options={{
          tabBarIcon: () => <MIcon name="newspaper-variant-multiple" size={30} color="#4F8EF7" />,

          headerTransparent: true,
        }} />
      <TabBottom.Screen name={namer.navigation.profile} component={Screen_profile} options={{
        tabBarIcon: () => <IIcon name="person-outline" size={30} color="#4F8EF7" />,
      }} />
    </TabBottom.Navigator>
  );


  if (getAllGood === false) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}><LottieView source={resourceMap.lottie.infinityLoading} autoPlay loop style={{ width: 220, height: 220 }} /></View>
  }



  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName={currentSession?.x_omi_payload_hash ? "Home" : namer.navigation.login}>

          {!currentSession?.x_omi_payload_hash ? (<>
            <Stack.Screen name={namer.navigation.login} component={Auth_InputPhoneNumberPage} options={{ headerShown: false }} />
          </>) : (<>

            <Stack.Screen name="Home" component={BottomTabNavigator} options={{ headerShown: false }} />
            <Stack.Screen name={namer.navigation.conversation} component={Screen_conversation} options={{ headerBackTitle: '' }} />
            <Stack.Screen name={namer.navigation.editprofile} component={Screen_editprofile} options={{ headerBackTitle: '', headerTransparent: true }} />
            <Stack.Screen name={namer.navigation.editpreference} component={Screen_editpreference} />
            <Stack.Screen name={namer.navigation.coin} component={Screen_Coin} />
            <Stack.Screen name={namer.navigation.peoplesOnePerson} component={Peoples_Screen} options={{ headerBackTitle: '' }} />
            <Stack.Screen name={namer.navigation.subscription} component={Screen_Subscribe} options={{
              headerTintColor: "#6d6139ff", title: "Upgrade Your Experience", headerBackTitle: '', headerTitleAlign: "center", headerTitleStyle: {
                fontSize: 20,
                fontWeight: 'bold',
                color: '#fff',
                fontFamily: 'Helvetica',
              }, headerStyle: { backgroundColor: '#1a1919ff' }
            }} />

          </>)}
          <Stack.Screen name={namer.navigation.settings} component={Screen_settings} options={{ headerBackTitle: '' }} />
          <Stack.Screen name={"zz_nofile"} component={Zz_nofilee} options={{}} />

        </Stack.Navigator>
      </NavigationContainer>

    </>
  );
};




const App = () => (
  <SafeAreaProvider style={{ flex: 1, position: 'relative' }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Loaderx />
      <MainApp />
      <Toastx />
    </GestureHandlerRootView>
  </SafeAreaProvider>
);

export default App;
