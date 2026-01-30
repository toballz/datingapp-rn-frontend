import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import IIcon from 'react-native-vector-icons/Ionicons';
import MIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { View, Text, Pressable, ScrollView, Alert, ImageBackground, TouchableOpacity, StyleSheet, Image, Modal } from 'react-native';
import { Loaderx, FullScreenImageModal } from '../funcs/functions_stateful';
import { useFocusEffect } from '@react-navigation/native';
import { styles, namer, colors, resourceMap } from '../funcs/static';
import { Screen_editpreference } from './PreferenceEdit';
import { _http_request, getCurrentLocation, help, hostServer, llStorage, logReport, preloadImages, screenHeight, screenWidth, sleep } from '../funcs/functions';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { TextInput } from 'react-native-gesture-handler';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'react-native-linear-gradient';
import { CBottomSheetRef, CBottomSheet } from '../funcs/customBottomSheet';
import { Toastx } from '../funcs/customNotification';
import FastImage from 'react-native-fast-image';
import LottieView from 'lottie-react-native';



export function Peoples_Screen({ route, navigation }: { route: any, navigation: any }) {
    const __MAPPER = llStorage.CONFIG.get()?.mapper;

    const [getLoading, setLoading] = useState<Boolean>(false);

    const [getPeopleToMatch, setPeopleToMatch] = useState<any[] | null>(null);
    const [gptmd, sptmd] = useState<boolean>(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const headerHeight = useHeaderHeight();
    const [getProfile, setProfile] = useState(llStorage.currentProfile.get()?.currentUser);
    const [getSkippedPeoples, setSkippedPeoples] = useState<any[]>([]);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [getFullscreenClickImage, setFullscreenClickImage] = useState<string | null>(null);
    const [showItsAMatchModal, setShowItsAMatchModal] = useState(false);

    const bottomSheetRef_secondview = useRef<CBottomSheetRef>(null);
    const bottomSheetRef_preferenceEdit = useRef<CBottomSheetRef>(null);
    const bottomSheetRef_reportUser = useRef<CBottomSheetRef>(null);
    const bottomSheetRef_location = useRef<CBottomSheetRef>(null);

    const functs = {
        onePersonProfile: route?.params?.getOnePersonId, //str
        isAlreadyLiked: route?.params?.alreadyLiked || false, //bool
        previewP: route?.params?.previewProfile || false,
        likedMatchId: route?.params?.likedMatchedId,//str
        refreshPeoples: () => {
            const j = getPeopleToMatch?.filter((v: any) => v.user_id !== getPeopleToMatch?.[0]?.user_id);
            console.log("remove last---", getPeopleToMatch?.length, j?.length)
            setPeopleToMatch(j ?? null);
        }
    }
    let tabBottomHeight = 0;
    try {
        tabBottomHeight = !functs.onePersonProfile ? useBottomTabBarHeight() : 0;
    } catch (ds) {
        logReport({
            type: "layout",
            logMessage: "",
            stackTrace: ds,
            useraction: "tabBottomHeight"
        })
    }

    const lottieRef = useRef<LottieView>(null);


    const deckStyles = StyleSheet.create({
        cardImage: { width: '100%', height: ((screenHeight * 0.96)) - headerHeight - tabBottomHeight - 14 },
        cardFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, gap: 8 },
        nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        name: { color: '#fff', fontSize: 26, fontWeight: '800' },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        chip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(15,23,42,0.75)', borderRadius: 18 },
        chipText: { color: '#e5e7eb', fontSize: 13, textTransform: 'capitalize' },
        detailCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 5, marginTop: 14 },
        promptCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginTop: 14 },
        promptTitle: { color: '#0ea5e9', fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
        promptAnswer: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 24 },
        sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
        detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
        detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#f3f4f6', borderRadius: 12, flexBasis: '48%' },
        detailText: { color: '#0f172a', fontSize: 14, flexShrink: 1 },
        galleryImage: { width: 160, height: 200, borderRadius: 16, backgroundColor: colors.gray1 },
        actionDock: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 16 },
        circleBtn: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
        circleBtnGhost: { backgroundColor: '#fff' },
        circleBtnAccent: { backgroundColor: '#e0f2fe' },
        circleBtnPrimary: { backgroundColor: '#dcfce7' },
        cardShadow: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
        tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
        tapZone: { flex: 1 },
        progressDots: { position: 'absolute', top: 16, alignSelf: 'center', flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
        dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
        dotActive: { backgroundColor: '#fff' },
    });

    const matchStyles = StyleSheet.create({
        backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
        card: { width: '100%', maxWidth: 380, backgroundColor: '#0f172a', borderRadius: 24, padding: 20, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
        title: { fontSize: 28, fontWeight: '800', color: '#fff' },
        subtitle: { fontSize: 14, color: '#cbd5e1', textAlign: 'center' },
        photoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
        photoCard: { width: 130, height: 170, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.gray1, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
        leftPhoto: { transform: [{ rotate: '-12deg' }], marginRight: -26, borderWidth: 2, borderColor: '#0ea5e9' },
        rightPhoto: { transform: [{ rotate: '12deg' }], marginLeft: -26, borderWidth: 2, borderColor: '#22c55e' },
        primaryBtn: { width: '100%', backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
        primaryBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
        secondaryBtn: { paddingVertical: 12 },
        secondaryBtnText: { color: '#38bdf8', fontSize: 15, fontWeight: '700' },
    });

    const ReportContent = () => {
        const [selectedReason, setSelectedReason] = useState('');
        const [otherText, setOtherText] = useState('');
        const styless = StyleSheet.create({
            radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
            radioOuter: {
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: '#999',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
            },
            radioOuterSelected: { borderColor: '#ff3366' },
            radioInner: {
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#ff3366',
            },
            radioText: { fontSize: 16, color: '#333' },

        });

        const reasons = [
            'Inappropriate Profile Content',
            'Harassment or Hate Speech',
            'Fake profile or Impersonation',
            'Spam or Scam',
            'Underage User/Content',
            'Promoting, Selling or Soliciting',
            'Violence or Harmful Behavior',
            'Privacy Violation',
            'Suspicious Behavior',
            'Other'
        ];
        const reportedUserName = getPeopleToMatch?.[0]?.user_fullname;
        const scrollRef = useRef<ScrollView>(null);

        return (
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} style={{ flex: 1 }}  >
                <View style={[styles.container, { paddingBottom: 5 }]}>
                    <Text style={styles.title}>Report {reportedUserName}</Text>
                    <Text style={[styles.subtitle, { marginBottom: 12, textAlign: "center" }]}>Select a reason</Text>
                    {reasons.map((reason, index) => (<TouchableOpacity key={index} style={styless.radioRow} onPress={() => { setSelectedReason(reason); scrollRef.current?.scrollToEnd({ animated: true }); }} >
                        <View style={[styless.radioOuter, selectedReason === reason && styless.radioOuterSelected]}>{selectedReason === reason && <View style={styless.radioInner} />}</View>
                        <Text style={styless.radioText}>{reason}</Text>
                    </TouchableOpacity>))}

                    {selectedReason === 'Other' && (<View style={{ marginBottom: 12 }}>
                        <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top', marginBottom: 0 }]} placeholder="Please specify" value={otherText} onChangeText={setOtherText} multiline maxLength={300} />
                        <Text style={{ fontSize: 11, color: '#909090', textAlign: 'right' }}>{otherText.length} / 300</Text>
                    </View>)}

                    <TouchableOpacity style={[styles.pressableButton, { marginTop: 15 }]} onPress={() => {
                        const finalReason = selectedReason === 'Other' ? otherText : selectedReason;
                        if (finalReason) {
                            Loaderx.show();
                            logReport({
                                type: "reportuser",
                                useraction: "snitch",
                                logMessage: finalReason,
                                reporteduserId: getPeopleToMatch?.[0]?.user_id
                            });
                            //then 
                            peoples_action("report", 4).then(() => {

                                bottomSheetRef_reportUser.current?.close();
                                Toastx.show({
                                    type: "success",
                                    message: reportedUserName + " has been reported!"
                                });
                                Loaderx.hide();
                                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                            });

                        } else {
                            Toastx.show({ type: 'info', message: 'Please select a reason to report.' });
                        }
                    }}>
                        <Text style={styles.pressableButtonText}>Submit Report</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>);
    }
    const LocationContent = () => (
        <View style={{ gap: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: "center", }}>Your Location</Text>

            <View style={{ flexDirection: "row", gap: 5 }}>
                <IIcon name="location" size={30} color="#000" />
                <View>
                    <Text style={{ fontSize: 18, }}>{(getProfile?.user_location?.city && getProfile?.user_location?.city !== "unknown") ? getProfile?.user_location?.city + ", " : ""}{getProfile?.user_location?.state}</Text>
                    <Text style={{ fontSize: 14, color: '#909090', }}>Your primary Dating location.</Text>
                </View>
            </View>
            <Pressable style={[styles.pressableButton, { backgroundColor: '#4F8EF7', marginBottom: 10 }]}
                onPress={() => {
                    getCurrentLocation().then(async (location: any) => {
                        if (location) {
                            let cords = {
                                latd: location?.coords?.latitude,
                                long: location?.coords?.longitude,
                                accuracy: location.coords.accuracy,
                                altitude: location.coords.altitude,
                                altitudeAccuracy: location.coords.altitudeAccuracy,
                                heading: location.coords.heading,
                                speed: location.coords.speed,
                                timestamp: location.timestamp,
                            };
                            // Update the current user profile with the new location
                            _http_request({
                                customApiUrl: hostServer() + "/api/core/v1/pushLocation",
                                reqType: 'POST', bodyArray: {
                                    longlatd: JSON.stringify(cords),
                                }
                            }).then((response) => {
                                if (response?.code === 200) {
                                    Toastx.show({ type: 'success', message: "Location updated successfully!" });

                                    llStorage.currentProfile.load().then(() => {
                                        setProfile(llStorage.currentProfile.get()?.currentUser);
                                    });

                                    sptmd(!gptmd); // Refresh the peoples list
                                } else {
                                    Toastx.show({ type: 'error', message: "Failed to update location." });
                                }

                            });
                        } else {
                            Toastx.show({ type: 'error', message: "Unable to get current location." });
                        }
                    });
                }}>
                <Text style={styles.pressableButtonText}>Refresh Current Location</Text>
            </Pressable>
        </View>
    );


    useEffect(() => {
        setPhotoIndex(0);
    }, [getPeopleToMatch?.[0]?.user_id]);


    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitleAlign: 'left',
            headerTransparent: true,
            headerTitle: () => <View style={{ paddingVertical: 6, }}>
                <View style={{ alignItems: "center", flexDirection: "row", gap: 2 }}>
                    {getPeopleToMatch?.[0]?.user_verified === 1 && <IIcon name="checkmark-done-circle-sharp" size={20} color="#4F8EF7" />}
                    <Text style={{ fontSize: 20, fontWeight: 'bold', textTransform: "capitalize" }}>{(getPeopleToMatch?.[0]?.user_fullname ?? "") + (getPeopleToMatch?.[0]?.user_bio_dob ? ", " + help.getageFromDOB(getPeopleToMatch?.[0]?.user_bio_dob) : "")}</Text>
                </View>
            </View>,

            headerRight: () => !functs.onePersonProfile && (
                <View style={{ paddingRight: 10, flexDirection: "row", gap: 14, alignItems: "center" }}>
                    {getSkippedPeoples.length > 0 && <Pressable style={{ gap: 3 }} onPress={() => {
                        bottomSheetRef_secondview.current?.open({
                            onClose: () => { },
                            sheetHeight: .5,
                            stylexj: { paddingHorizontal: 0, }
                        });
                    }}>
                        <MIcon name="backup-restore" size={30} color="#204586ff" />
                    </Pressable>}
                    <Pressable style={{ gap: 3 }} onPress={() => {

                        bottomSheetRef_location.current?.open({
                            onClose: () => { },
                            sheetHeight: .3
                        });

                    }}>
                        <IIcon name="location-outline" size={28} color="#204586ff" />
                    </Pressable>
                    <Pressable style={{ gap: 3 }} onPress={() => {

                        bottomSheetRef_preferenceEdit.current?.open({
                            onClose: () => { },
                            sheetHeight: .8,
                            stylexj: { paddingHorizontal: 5 }
                        });

                    }}>
                        <IIcon name="filter-outline" size={30} color="#204586ff" />
                    </Pressable>
                </View>),
        });
    }, [getPeopleToMatch, getSkippedPeoples]);

    useFocusEffect(React.useCallback(() => {
        _http_request({
            reqType: 'POST',
            customApiUrl: hostServer() + "/api/core/v1/getPeopleToMatch",
            bodyArray: {
                getOnePersons_id2: functs.onePersonProfile
            }
        }).then((response) => {
            if (response?.code === 200) {
                let peopleMatchArr = response?.matchespeoples ?? [];
                //console.log("new peoples reloaded total, now:", peopleMatchArr.length);
                setPeopleToMatch(peopleMatchArr);
            } else if (response?.code === 404) {
                setPeopleToMatch([]);
            }
        }).finally(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });// Scroll to the top of the scroll view after action
        });

    }, [gptmd]));


    async function peoples_action(
        what: "like" | "superlike" | "dislike" | "block" | "report",
        matchStatus: number = 0,
        showloader: boolean = true) {
        try {
            showloader && Loaderx.show();
            switch (what) {
                case 'like':
                case 'superlike':
                case 'dislike':
                case 'report':
                case 'block':
                    const matchId = getPeopleToMatch?.[0]?.match_id || functs.likedMatchId;
                    await _http_request({
                        reqType: 'POST',
                        customApiUrl: hostServer() + "/api/core/v1/pushPeopleToMatch",
                        bodyArray: {
                            user_id2: getPeopleToMatch?.[0]?.user_id,
                            match_status: matchStatus,
                            matchId: matchId
                        }
                    }).then((response) => {
                        if (what === "dislike") {
                            if (functs.onePersonProfile) {
                                navigation.popToTop();
                                return;
                            } else {
                                setSkippedPeoples((prev) => [getPeopleToMatch?.[0], ...prev]);
                            }
                        }
                        // if its a match
                        if (response?.itisamatch) {
                            setShowItsAMatchModal(true);
                            return;
                        }

                        // 
                        if ((getPeopleToMatch?.length ?? 0) <= 2 && !functs.onePersonProfile) {// Refresh the people to match list if there are only 2 or fewer left after the action
                            setPeopleToMatch(null);
                            sptmd((prev: boolean) => !prev);
                            console.log("refresh from server...");
                        }

                        if (!functs.onePersonProfile) {
                            // if not from a match
                            functs.refreshPeoples();
                        }

                    }).finally(() => {
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });// Scroll to the top of the scroll view after action
                    });
                    break;
                case 'report':
                    logReport({ type: "reportuser", useraction: "reporting user", logMessage: "Reason: ", reporteduserId: getPeopleToMatch?.[0]?.user_id });
                    break;
            }
        } catch (e: any) {
            Toastx.show({ type: 'info', message: 'Error processing request' });
            logReport({
                type: "function",
                extra: "Error in peoples_action",
                useraction: "initailizing app",
                logMessage: e.message,
                stackTrace: e
            });
        } finally {
            setTimeout(() => {
                Loaderx.hide();
            }, 765);
        }
    }


    const currentPerson = getPeopleToMatch?.[0];
    const nextPerson = getPeopleToMatch?.[1];
    const currentUserImages = (currentPerson?.user_image ?? []);
    const currentPhotos = currentUserImages.filter((img: any) => img?.p);
    const prompts = [currentPerson?.user_bio_prompt?.[0], currentPerson?.user_bio_prompt?.[1], currentPerson?.user_bio_prompt?.[2],].filter(Boolean);

    // pre next person load images
    useEffect(() => {
        if (nextPerson?.user_image?.length > 1) {
            preloadImages(nextPerson?.user_image?.map((img: any) => __MAPPER?.img_domain[0] + img.p) || []);
        }
    }, [getPeopleToMatch]);

    const highlightFields = !currentPerson ? [] : [
        { icon: <IIcon name="location-outline" size={18} color="#0ea5e9" />, value: currentPerson?.user_location?.city },
        { icon: <MIcon name="ruler" size={18} color="#0ea5e9" />, value: currentPerson?.user_bio_height ? help.cmToFtIn(currentPerson?.user_bio_height) : null },
        { icon: <IIcon name="heart-circle-outline" size={18} color="#0ea5e9" />, value: __MAPPER?.bio_intent?.[currentPerson?.user_bio_relationshipgoal] },
        { icon: <MIcon name="flag-outline" size={18} color="#0ea5e9" />, value: currentPerson?.user_bio_ethnicity },
    ].filter((item) => item.value);

    const detailFields = !currentPerson ? [] : [
        { icon: <MIcon name="candle" size={22} color="#0ea5e9" />, value: __MAPPER?.bio_religion?.[currentPerson?.user_bio_religion] },
        { icon: <IIcon name="barbell-outline" size={22} color="#0ea5e9" />, value: __MAPPER?.bio_bodytype?.[currentPerson?.user_bio_bodytype] },
        { icon: <MIcon name="baby-carriage" size={22} color="#0ea5e9" />, value: __MAPPER?.bio_children?.[currentPerson?.user_bio_children] },
        { icon: <IIcon name="wine-outline" size={22} color="#0ea5e9" />, value: __MAPPER?.bio_drinking?.[currentPerson?.user_bio_drinking] },
        { icon: <MIcon name="smoking" size={22} color="#0ea5e9" />, value: __MAPPER?.bio_smoking?.[currentPerson?.user_bio_smoking] },
        { icon: <IIcon name="transgender-outline" size={22} color="#fe6fa6" />, value: __MAPPER?.bio_gender?.[currentPerson?.user_bio_gender] },
        { icon: <MIcon name="gavel" size={22} color="#0ea5e9" />, value: __MAPPER?.bio_politics?.[currentPerson?.user_bio_politicalview] },
        { icon: <MIcon name="dog-side" size={18} color="#0ea5e9" />, value: __MAPPER?.bio_pets?.[currentPerson?.user_bio_haspet] },
    ].filter((item) => item.value);

    const writableFields = !currentPerson ? [] : [
        { icon: <MIcon name="briefcase-variant-outline" size={22} color="#0ea5e9" />, value: (currentPerson?.user_bio_jobrole) },
        { icon: <MIcon name="home-outline" size={22} color="#0ea5e9" />, value: currentPerson?.user_bio_hometown },
        { icon: <MIcon name="school-outline" size={22} color="#0ea5e9" />, value: currentPerson?.user_bio_schoolattended },
    ].filter((item) => item.value);

    if (getPeopleToMatch === null) {
        return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><LottieView
            source={resourceMap.lottie.pulsingLoading}
            autoPlay
            loop
            style={{ width: 220, height: 220 }}
        /></View>
    }
    return (
        <View style={[styles.container, { paddingHorizontal: 0, paddingTop: headerHeight }]}>

            {getPeopleToMatch?.length === 0 ? (

                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 17, fontWeight: 500 }}>No more profiles to show.</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                        <Text style={{ fontSize: 13 }}>Try updating your</Text>
                        <Pressable onPress={() => {

                            bottomSheetRef_preferenceEdit.current?.open({
                                onClose: () => { },
                                sheetHeight: .86,
                                stylexj: { paddingHorizontal: 5 }
                            });

                        }}>
                            <Text style={{ color: "#099a", fontSize: 13 }}> preferences.</Text>
                        </Pressable>
                    </View>

                </View>
            ) : (
                <SafeAreaView style={{ flex: 1 }} edges={functs.onePersonProfile ? ['bottom'] : []}>
                    <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} horizontal={false}
                        contentContainerStyle={[styles.conainerScrollView, { paddingBottom: functs.isAlreadyLiked ? 20 : 100 }]}>

                        <View style={[{ borderRadius: 20, overflow: 'hidden', backgroundColor: '#0f172a', marginTop: 10 }, deckStyles.cardShadow]}>
                            <ImageBackground progressiveRenderingEnabled={true} source={{ uri: __MAPPER?.img_domain[0] + (currentPhotos?.[photoIndex]?.p ?? "") }} onError={() => {
                                return logReport({
                                    type: "http",
                                    logMessage: "Image load",
                                    url: __MAPPER?.img_domain[0] + (currentPhotos?.[photoIndex]?.p ?? ""),
                                    useraction: 'Image Load',
                                    stackTrace: null
                                });
                            }}
                                style={deckStyles.cardImage} resizeMode="cover">
                                <LinearGradient colors={['rgba(0, 0, 0, 0.35)', 'rgba(0, 0, 0, 0)']}
                                    start={{ x: 0.5, y: 1 }}     // top
                                    end={{ x: 0.5, y: 0 }}       // bottom
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        height: '40%',
                                    }} />
                                <View style={deckStyles.tapZones}>
                                    <Pressable style={deckStyles.tapZone} onPress={() => setPhotoIndex((prev) => Math.max(0, prev - 1))} />
                                    <Pressable style={deckStyles.tapZone} onPress={() => setPhotoIndex((prev) => (prev + 1 < currentPhotos.length ? prev + 1 : prev))} />
                                </View>
                                {currentPhotos.length > 1 && (
                                    <View style={deckStyles.progressDots}>
                                        {currentPhotos.map((_: any, idx: number) => (
                                            <View key={idx} style={[deckStyles.dot, idx === photoIndex ? deckStyles.dotActive : null]} />
                                        ))}
                                    </View>
                                )}
                                <View style={deckStyles.cardFooter}>
                                    <View style={deckStyles.nameRow}>
                                        <Text style={deckStyles.name}>{currentPerson?.user_fullname}{currentPerson?.user_bio_dob ? ", " + help.getageFromDOB(currentPerson?.user_bio_dob) : ""}</Text>
                                        {currentPerson?.user_verified === 1 && <IIcon name="checkmark-done-circle-sharp" size={22} color="#38bdf8" />}
                                    </View>
                                    <View style={deckStyles.chipRow}>
                                        {highlightFields.map((field, idx) => (
                                            <View key={idx} style={deckStyles.chip}>
                                                {field.icon}
                                                <Text style={deckStyles.chipText}>{field.value}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </ImageBackground>
                        </View>


                        <View style={[deckStyles.detailCard, deckStyles.cardShadow]}>
                            <Text style={deckStyles.sectionTitle}>About {currentPerson?.user_fullname?.split(" ")?.[0] || "them"}</Text>
                            {currentPerson?.user_bio_about && <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20 }}>{currentPerson?.user_bio_about}</Text>}
                            {detailFields.length > 0 && (
                                <View style={deckStyles.detailGrid}>
                                    {detailFields.map((field, idx) => (
                                        <View key={idx} style={deckStyles.detailItem}>
                                            {field.icon}
                                            <Text style={[deckStyles.detailText, { textTransform: "capitalize", paddingRight: 1 }]}>{field.value}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                        {writableFields.length > 0 && (
                            <View style={[deckStyles.detailCard, deckStyles.cardShadow]}>
                                <Text style={deckStyles.sectionTitle}>More about {currentPerson?.user_fullname?.split(" ")?.[0] || "them"}</Text>
                                <View style={[deckStyles.detailGrid, { flexWrap: 'nowrap', flexDirection: 'column' }]}>
                                    {writableFields.map((field, idx) => (
                                        <View key={idx} style={deckStyles.detailItem}>
                                            {field.icon}
                                            <Text style={deckStyles.detailText}>{field.value}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}


                        {currentUserImages.length > 0 && (
                            <View style={[deckStyles.detailCard, deckStyles.cardShadow]}>
                                <Text style={deckStyles.sectionTitle}>Photos</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                    {currentUserImages.map((img: any, idx: number) => (
                                        <Pressable key={idx} onPress={() => setFullscreenClickImage(__MAPPER?.img_domain[0] + img.p)}>
                                            <Image source={{ uri: __MAPPER?.img_domain[0] + img.p }} style={deckStyles.galleryImage} resizeMode="cover" />
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {prompts.map((prompt: any, idx: number) => (
                            prompt?.q && prompt?.a && (
                                <View key={idx} style={[deckStyles.promptCard, deckStyles.cardShadow,]}>
                                    <Text style={deckStyles.promptTitle}>{prompt?.q}</Text>
                                    <Text style={deckStyles.promptAnswer}>{prompt?.a}</Text>
                                </View>
                            )
                        ))}

                        {!functs.previewP && (
                            <View style={[deckStyles.detailCard, deckStyles.cardShadow]}>
                                <Text style={deckStyles.sectionTitle}>Safety</Text>
                                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                                    <Pressable style={[styles.pressableButton, { backgroundColor: colors.warning, flex: 1 }]} onPress={() => {
                                        bottomSheetRef_reportUser.current?.open({ sheetHeight: .6 });
                                    }}>
                                        <Text style={styles.pressableButtonText}>Report</Text>
                                    </Pressable>
                                    <Pressable style={[styles.pressableButton, { flex: 1, backgroundColor: colors.error }]} onPress={async () => {
                                        function showConfirmAlert() {
                                            return new Promise((resolve) => {
                                                Alert.alert(
                                                    "Block this person?",
                                                    "Blocking this person prevents them from ever seeing your profile or message you!",
                                                    [
                                                        { text: "No", onPress: () => { resolve(false); }, style: "cancel", },
                                                        { text: "Block", onPress: () => { resolve(true); }, },
                                                    ],
                                                    { cancelable: false }
                                                );
                                            });
                                        }
                                        if (await showConfirmAlert() === false) { return; } else {
                                            peoples_action("block", 3).then(() => {

                                                if (functs.onePersonProfile) {
                                                    navigation.popToTop();
                                                } else {
                                                    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                                                }
                                            });
                                        }
                                    }}>
                                        <Text style={styles.pressableButtonText}>Block</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {!functs.isAlreadyLiked && (
                        <View style={[deckStyles.actionDock, functs.onePersonProfile ? { paddingBottom: 30 } : {}]}>
                            <Pressable style={[deckStyles.circleBtn, deckStyles.circleBtnGhost]} onPress={() => peoples_action('dislike', 2)}>
                                <IIcon name="close" size={30} color="#f43f5e" />
                            </Pressable>
                            {!functs.onePersonProfile && <Pressable style={[deckStyles.circleBtn, deckStyles.circleBtnAccent]} onPress={() => peoples_action('superlike', getPeopleToMatch?.[0]?.match_id ? 1 : 5)}>
                                <IIcon name="diamond" size={30} color="#0ea5e9" />
                            </Pressable>}
                            <Pressable style={[deckStyles.circleBtn, deckStyles.circleBtnPrimary]} onPress={() => {
                                lottieRef.current?.play();
                                setLoading(true);
                                peoples_action('like', 0, false).then(async () => {
                                    await sleep(700);
                                    setLoading(false);
                                    lottieRef.current?.reset();
                                })
                            }}>
                                <IIcon name="heart" size={30} color="#22c55e" />
                            </Pressable>
                        </View>
                    )}
                </SafeAreaView>
            )}





            <CBottomSheet ref={bottomSheetRef_reportUser}>
                <ReportContent />
            </CBottomSheet>

            <CBottomSheet ref={bottomSheetRef_preferenceEdit}>
                <Screen_editpreference closeModal={() => { setPeopleToMatch(null); sptmd(!gptmd); bottomSheetRef_preferenceEdit.current?.close(); }} />
            </CBottomSheet>

            <CBottomSheet ref={bottomSheetRef_location}>
                <LocationContent />
            </CBottomSheet>

            {/* ITS a matCH */}
            <Modal visible={showItsAMatchModal} transparent animationType="fade"
                onRequestClose={() => {
                    setShowItsAMatchModal(false);
                    if (functs.onePersonProfile) {
                        navigation.popToTop();
                    }
                }} >
                <View style={matchStyles.backdrop}>
                    <View style={matchStyles.card}>
                        <View style={styles.zcircle1} />
                        <View style={styles.zcircle2} />
                        <View style={styles.zcircle3} />

                        <Text style={matchStyles.title}>It's a match!</Text>
                        <Text style={matchStyles.subtitle}>You and {getPeopleToMatch?.[0]?.user_fullname || "them"} like each other</Text>

                        <View style={matchStyles.photoRow}>
                            <View style={[matchStyles.photoCard, matchStyles.leftPhoto]}>
                                <Image source={{ uri: String(__MAPPER?.img_domain[0] + (getProfile?.user_image?.[0]?.p ?? "")) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            </View>
                            <View style={[matchStyles.photoCard, matchStyles.rightPhoto]}>
                                <Image source={{ uri: String(__MAPPER?.img_domain[0] + (currentUserImages?.[0]?.p ?? "")) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            </View>
                        </View>

                        <Pressable style={matchStyles.primaryBtn} onPress={() => {
                            if (functs.onePersonProfile) {
                                navigation.popToTop();
                            }
                            const matchId = getPeopleToMatch?.[0]?.match_id || functs.likedMatchId;
                            setShowItsAMatchModal(false);
                            navigation.push(namer.navigation.conversation, { matchId });
                        }} >
                            <Text style={matchStyles.primaryBtnText}>Start conversation</Text>
                        </Pressable>
                        <Pressable style={matchStyles.secondaryBtn} onPress={() => {
                            setShowItsAMatchModal(false);
                            if (!functs.onePersonProfile) {
                                functs.refreshPeoples();
                            } else {
                                navigation.popToTop();
                            }
                        }} >
                            <Text style={matchStyles.secondaryBtnText}>Continue swiping</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <CBottomSheet ref={bottomSheetRef_secondview}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                    <Text style={styles.title}>Previously Skipped Profiles</Text>
                    <View style={{ gap: 10 }}>
                        {getSkippedPeoples.length === 0 ? (<Text style={{ fontSize: 15, textAlign: "center", marginTop: 20 }}>You have not skipped any profiles yet.</Text>) : (getSkippedPeoples.map((skippedPerson, index) => (
                            <View key={index} style={[styles.card]}>
                                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                                    <FastImage source={{ uri: __MAPPER?.img_domain[0] + skippedPerson?.user_image?.[0]?.p }} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.gray1 }} />
                                    <View>
                                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                                            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{skippedPerson?.user_fullname}</Text>
                                            {skippedPerson?.user_bio_dob && <Text style={{ fontSize: 14, color: '#909090' }}>, {help.getageFromDOB(skippedPerson?.user_bio_dob)}</Text>}
                                            {skippedPerson?.user_verified === 1 && <IIcon name="checkmark-done-circle-sharp" size={16} color="#4F8EF7" />}
                                        </View>
                                        <Text style={{ fontSize: 14, color: '#909090' }}>{skippedPerson?.user_bio_jobrole || ''}</Text>
                                    </View>
                                    <View style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: 5 }} >
                                        <Pressable style={[{ padding: 10, backgroundColor: '#ff7272ff', borderRadius: 25 }]} onPress={() => {
                                            setSkippedPeoples((prev) => prev.filter((p) => p.user_id !== skippedPerson.user_id));
                                        }}>
                                            <IIcon name="close" size={25} color="#fff" />
                                        </Pressable>
                                        <Pressable style={[{ padding: 10, backgroundColor: '#79c3ffff', borderRadius: 25 }]} onPress={() => {
                                            setPeopleToMatch((prev) => [skippedPerson, ...(prev ?? [])]);
                                            setSkippedPeoples((prev) => prev.filter((p) => p.user_id !== skippedPerson.user_id));
                                            bottomSheetRef_secondview.current?.close();
                                        }}>
                                            <IIcon name="eye" size={25} color="#fff" />
                                        </Pressable>
                                    </View>
                                </View>
                            </View>)))}
                    </View>

                </ScrollView>
            </CBottomSheet>



            {/* FULLSCREEN */}
            <FullScreenImageModal visible={!!getFullscreenClickImage} uri={getFullscreenClickImage} onClose={() => setFullscreenClickImage(null)} />

            {/* LOADERs */}
            {getLoading && <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.31)', zIndex: 1011, }}><LottieView ref={lottieRef} source={resourceMap.lottie.heartpop} loop autoPlay style={{ width: 250, height: 250 }} /></View>}
        </View >
    );
}
