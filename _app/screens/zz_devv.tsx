import React, { useRef, useMemo, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { Toastx } from '../funcs/customNotification';
import { __init__app, cacheStorage, hostServer, llStorage, logReport } from '../funcs/functions';
import DeviceInfo from 'react-native-device-info';
import RNRestart from 'react-native-restart';


export function Zz_devv({ route, navigation }: { route: any, navigation: any }) {
    const __MAPPER = llStorage.CONFIG.get()?.mapper;


    return (
        <View style={{ flex: 1 }}>
            <Text style={{ backgroundColor: "#7eb400", color: "#fffdfd", padding: 10 }}>Debug Tools</Text>
            <ScrollView style={[{ flex: 1 }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 10, gap: 20 }}>
                <Pressable style={modernStyles.dangerSection} onPress={async () => {
                    await __init__app();
                    await cacheStorage.getCurrentUserProfile(true);
                    Toastx.show({ type: "info", message: "_ _init__app updated successfully" });
                }}>
                    <Text>reload update __init__app fun </Text>
                </Pressable>

                <Pressable style={modernStyles.dangerSection} onPress={() => { Linking.openURL(__MAPPER?.img_domain[0]); }}>
                    <Text>Image url: {__MAPPER?.img_domain[0]}</Text>
                </Pressable>

                <Pressable style={modernStyles.dangerSection} onPress={async () => { console.log("uyuu", await cacheStorage.getProducts(true)) }}>
                    <Text>getProducts</Text>
                </Pressable>

                <Pressable style={modernStyles.dangerSection} onPress={async () => {
                    Linking.openURL(
                        hostServer() + '/admin/admin_user_detail.php?id=' + (await cacheStorage.getCurrentUserProfile())?.user_id
                    );
                }}>
                    <Text>Profile admin url:{"\n"}{hostServer()}</Text>
                </Pressable>



                <Pressable style={modernStyles.dangerSection} onPress={() => {
                    RNRestart.restart();
                }}>
                    <Text>reload app</Text>
                </Pressable>

                <Pressable style={modernStyles.dangerSection} onPress={async () => {
                    logReport({
                        type: "tESTING",
                        extra: "Empty",
                        useraction: "Dev Tool",
                        url: "null",
                        logMessage: "string",
                        stackTrace: null,
                    });
                }}>
                    <Text>Test Log function</Text>
                </Pressable>

                <Pressable style={modernStyles.dangerSection} onPress={async () => {
                    navigation.navigate("zz_nofile");
                }}>
                    <Text>Testing null page</Text>
                </Pressable>

                <View style={modernStyles.dangerSection}>
                    <Text>\*** bundle ID: {DeviceInfo.getBundleId()}</Text>
                    <Text>\*** display name: {DeviceInfo.getApplicationName()}</Text>
                </View>


            </ScrollView>
        </View >

    );
}
// Modern Styles
const modernStyles = StyleSheet.create({

    dangerSection: {
        borderColor: "#ff4e42",
        borderWidth: 1,
        borderRadius: 15,
        padding: 12
    },
});
