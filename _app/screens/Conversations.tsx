import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, Pressable, TextInput, Alert, FlatList, Platform, TouchableOpacity, KeyboardAvoidingView, PermissionsAndroid, Linking, ImageBackground } from 'react-native';
import { Loaderx, FullScreenImageModal } from '../funcs/functions_stateful';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { namer, styles } from '../funcs/static';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { _http_request, help, convoHelper, llStorage, mediaHandler, screenWidth, hostServer, logReport } from '../funcs/functions';
import { Asset } from 'react-native-image-picker';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Sound, { AudioEncoderAndroidType, AudioSourceAndroidType, AVEncoderAudioQualityIOSType, OutputFormatAndroidType } from 'react-native-nitro-sound';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Ionicons';
import { CBottomSheetRef, CBottomSheet } from '../funcs/customBottomSheet';
import { Toastx } from '../funcs/customNotification';
import FastImage from 'react-native-fast-image';
import { SocketClient } from '../funcs/socket_realtimeData';

const CONFIG = {
    imgSelectUploadLimit: 5
};
interface convoInterface {
    messageId: string;
    fromMe: boolean;
    type: 'media' | 'text' | 'audio' | 'image' | 'video' | 'file';
    message: string | null;
    src: any[] | null
}

export function Screen_conversation({ navigation, route }: { navigation: any, route: any }) {
    const __MAPPER = llStorage.CONFIG.get()?.mapper;

    const [getConversations, setConversations] = useState<convoInterface[]>([]);
    const [getUser2Deets, setUser2Deets] = useState<any>([]);
    const [getConvoStarter, setConvoStarter] = useState<any>([]);
    const [starterIndex, setStarterIndex] = useState<number>(0);
    const [inputText, setInputText] = useState<string>('');
    const [getInputImageVideo, setInputImageVideo] = useState<Asset[]>([]);
    const [getInputAudio, setInputAudio] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingMs, setRecordingMs] = useState(0);
    const [voiceNoteLoading, setVoiceNoteLoading] = useState(false);
    const [audioPlayback, setAudioPlayback] = useState<{ id: string | null, position: number, duration: number, isPlaying: boolean }>({ id: null, position: 0, duration: 0, isPlaying: false });
    const inputTextRef = useRef<TextInput>(null);
    const [getconvoSendingstatus, setConvoSendingstatus] = useState<"sending..." | "sent" | `${string} delivered` | null>(null);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [reloadIfRealtimeData_File, setReloadIfRealtimeData_File] = useState<boolean>(false);

    const bottomSheetRef_convotools = useRef<CBottomSheetRef>(null);
    const [getFullscreenClickImage, setFullscreenClickImage] = useState<any | null>(null);
    const starterCarouselRef = useRef<FlatList<string>>(null);
    const starterViewConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;
    const starterViewable = useRef(({ viewableItems }: { viewableItems: any[] }) => {
        if (viewableItems?.[0]?.index != null) {
            setStarterIndex(viewableItems[0].index);
        }
    }).current;

    const img_server = String(__MAPPER?.img_domain?.[0] ?? "");
    const img_domain = img_server.replace(/\/+$/, "").split("/").slice(0, 3).join("/");

    // update from realtimedata root app
    useEffect(() => {
        const routeRetrivedData = route?.params?.realtimedata;
        if (routeRetrivedData?.lastMessage === ">>>photo" || routeRetrivedData?.lastMessage === ">>>audio") { setReloadIfRealtimeData_File((prev) => !prev); return; }
        if (routeRetrivedData?.lastMessage) {
            setConversations([{
                messageId: help.randomAlphanumeric(29),
                fromMe: false,
                type: "text",
                message: routeRetrivedData?.lastMessage,
                src: null,
            }, ...getConversations]);
        }
    }, [route?.params?.realtimedata])



    const handleInsertPrompt = (text: string) => {
        setInputText(text);
        inputTextRef.current?.focus();
    };

    const formatDurationLabel = (value?: number | null) => {
        if (value == null || Number.isNaN(value)) return '00:00:00';
        // Sound.* listeners already emit millisecond positions; avoid re-scaling to keep times accurate.
        const ms = Math.max(0, Math.floor(value));
        return Sound.mmssss(ms);
    };
    const formatDurationShort = (ms?: number | null) => {
        if (!ms || ms < 0) return null;
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    };
    const formatBytes = (bytes?: number | null) => {
        if (!bytes || bytes <= 0) return null;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
        const value = bytes / Math.pow(1024, i);
        return `${value.toFixed(value >= 10 ? 0 : 1)} ${sizes[i]}`;
    };
    const buildPlaybackLabels = (positionMs: number, durationMs?: number | null) => {
        const safePos = Math.max(0, positionMs || 0);
        const safeDuration = durationMs != null ? Math.max(0, durationMs) : null;
        const posLabel = formatDurationShort(safePos) ?? formatDurationLabel(safePos);
        const durationLabel = safeDuration ? (formatDurationShort(safeDuration) ?? formatDurationLabel(safeDuration)) : null;
        const remainingMs = safeDuration != null ? Math.max(safeDuration - safePos, 0) : null;
        const remainingLabel = remainingMs != null ? (formatDurationShort(remainingMs) ?? formatDurationLabel(remainingMs)) : null;
        return { posLabel, durationLabel, remainingLabel };
    };

    const resolveMediaUri = (srcItem?: any) => {
        if (!srcItem) return null;
        const rawUri = typeof srcItem === 'string' ? srcItem : (srcItem?.p ?? srcItem?.uri ?? srcItem?.path);
        if (!rawUri) return null;

        if (rawUri.startsWith('http') || rawUri.startsWith('file:') || rawUri.startsWith('content:')) {
            return rawUri;
        }


        if (rawUri.startsWith('/')) {
            return `${img_server}${rawUri}`;
        }

        return rawUri;
    };
    const normalizeFileUri = (path: string) => (path.startsWith('file://') ? path : `file://${path}`);
    const stripFileScheme = (path: string) => (path.startsWith('file://') ? path.slice(7) : path);
    const resolvePlaybackUri = (rawUri?: string | null) => {
        if (!rawUri) return null;
        const normalized = resolveMediaUri(rawUri);
        if (!normalized) return null;
        if (normalized.startsWith('http') || normalized.startsWith('file:') || normalized.startsWith('content:')) {
            return normalized;
        }
        return `${img_server}${normalized}`;
    };

    const requestAudioPermission = async () => {
        if (Platform.OS !== 'android') return true;
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                {
                    title: 'Microphone permission',
                    message: 'We need microphone access so you can send voice notes.',
                    buttonPositive: 'Allow',
                    buttonNegative: 'Cancel',
                }
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                Toastx.show({ message: 'Microphone permission is required to record.', type: 'info' });
                return false;
            }
            return true;
        } catch (error) {
            Toastx.show({ message: 'Unable to request microphone permission.', type: 'error' });
            return false;
        }
    };


    // Update the startVoiceNote function with better error handling:
    const startVoiceNote = async () => {
        if (isRecording || voiceNoteLoading) return;

        setVoiceNoteLoading(true);
        setInputAudio(null);
        setRecordingMs(0);

        const granted = await requestAudioPermission();
        if (!granted) {
            setVoiceNoteLoading(false);
            return;
        }

        try {
            // Clear any existing listeners
            Sound.removeRecordBackListener();

            Sound.setSubscriptionDuration?.(0.1);

            // Add listener with proper error handling
            const recordListener = Sound.addRecordBackListener((e) => {
                if (e?.currentPosition != null) {
                    setRecordingMs(e.currentPosition);
                }
            });

            const recordPath = Platform.OS === 'android'
                ? `${RNFS.CachesDirectoryPath}/voice_note_${Date.now()}.m4a`
                : undefined;

            await Sound.startRecorder(
                recordPath,
                {
                    AudioSourceAndroid: AudioSourceAndroidType.MIC,
                    OutputFormatAndroid: Platform.OS === 'android' ? OutputFormatAndroidType.MPEG_4 : undefined,
                    AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
                    AudioSamplingRate: 44100,
                    AudioEncodingBitRate: 128000,
                    AudioChannels: 1,
                    AVModeIOS: 'spokenAudio',
                    AVSampleRateKeyIOS: 44100,
                    AVNumberOfChannelsKeyIOS: 1,
                    AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
                },
                true
            );

            setIsRecording(true);
        } catch (error: any) {
            console.log('Error starting recorder:', error);
            // Clean up on error
            Sound.removeRecordBackListener();
            setIsRecording(false);

            if (error?.message?.includes('permission')) {
                Toastx.show({
                    message: 'Microphone permission required',
                    type: 'error'
                });
            } else {
                Toastx.show({
                    message: 'Unable to start recording',
                    type: 'error'
                });
            }
        } finally {
            setVoiceNoteLoading(false);
        }
    };

    const stopVoiceNote = async (keep: boolean = true) => {
        if (!isRecording) return;

        setVoiceNoteLoading(true);

        try {
            // Remove listener first to prevent any callbacks during stop
            Sound.removeRecordBackListener();

            // Stop the recorder
            let path = await Sound.stopRecorder();

            setIsRecording(false);

            if (keep && path) {
                if (Platform.OS === 'android' && path.endsWith('.mp4')) {
                    const rawPath = stripFileScheme(path);
                    const m4aPath = rawPath.replace(/\.mp4$/i, '.m4a');
                    try {
                        await RNFS.moveFile(rawPath, m4aPath);
                        path = normalizeFileUri(m4aPath);
                    } catch {
                        path = normalizeFileUri(rawPath);
                    }
                }
                const normalized = (path.startsWith('file://') || path.startsWith('content://'))
                    ? path
                    : normalizeFileUri(path);
                setInputAudio(normalized);
            } else {
                setInputAudio(null);
                setRecordingMs(0);
            }
        } catch (error: any) {
            console.log('Error stopping recorder:', error);

            // Handle specific error cases
            if (error?.message?.includes('Recorder not started') ||
                error?.message?.includes('path is unavailable')) {
                // Just clean up state without throwing error
                setIsRecording(false);
                setInputAudio(null);
                setRecordingMs(0);
                Toastx.show({
                    message: 'Recording was interrupted',
                    type: 'info'
                });
            } else {
                Toastx.show({
                    message: 'Unable to stop recording',
                    type: 'error'
                });
            }
        } finally {
            setVoiceNoteLoading(false);
        }
    };

    // Update the clearVoiceNote function:
    const clearVoiceNote = async () => {
        if (isRecording) {
            await stopVoiceNote(false);
        } else {
            setInputAudio(null);
            setRecordingMs(0);
        }
    };

    // Update the toggleVoiceNote function to prevent race conditions:
    const toggleVoiceNote = async () => {
        if (voiceNoteLoading) return;

        if (isRecording) {
            await stopVoiceNote(true);
        } else {
            await startVoiceNote();
        }
    };



    const funt = {
        matchId: route.params?.matchId,
        convoTools: (<>
            <View>
                <Pressable onPress={() => {
                    bottomSheetRef_convotools?.current?.close();
                    handleInsertPrompt("Let's plan a quick coffee this week? What day works for you.");
                }} style={{ paddingHorizontal: 10, paddingVertical: 15, flexDirection: "row", alignItems: "center" }}>
                    <IonIcon name="sparkles-outline" size={20} color="#4F8EF7" />
                    <Text style={{ fontSize: 16, marginLeft: 10 }}>Plan a date idea</Text>
                </Pressable>
                <Pressable onPress={() => {
                    bottomSheetRef_convotools?.current?.close();
                    navigation.push(namer.navigation.peoplesOnePerson, { alreadyLiked: true, likedMatchedId: funt.matchId, getOnePersonId: getUser2Deets?.uid, });
                }} style={{ paddingHorizontal: 10, paddingVertical: 15, flexDirection: "row", alignItems: "center" }}>
                    <IonIcon name="person-outline" size={20} color="#4F8EF7" />
                    <Text style={{ fontSize: 16, marginLeft: 10 }}>View Profile</Text>
                </Pressable>
                <Pressable onPress={async () => {
                    function showConfirmAlert() {
                        return new Promise((resolve) => {
                            Alert.alert(
                                "Block this person?",
                                "Blocking this person prevents them from ever seeing your profile or message you!", // Message
                                [
                                    { text: "No", onPress: () => { resolve(false); }, style: "cancel", },
                                    { text: "Block", onPress: () => { resolve(true); }, },
                                ],
                                { cancelable: false }
                            );
                        });
                    }
                    if (await showConfirmAlert() === true) {
                        Loaderx.show();

                        await _http_request({
                            customApiUrl: hostServer() + "/api/core/v1/pushPeopleToMatch",
                            reqType: 'POST', bodyArray: {
                                match_status: 3,
                                matchId: funt.matchId,
                            }
                        }).then(() => {
                            bottomSheetRef_convotools?.current?.close();
                            navigation.goBack();
                        });
                    }
                }} style={{ paddingHorizontal: 10, paddingVertical: 15, flexDirection: "row", alignItems: "center" }}>
                    <IonIcon name="ban-outline" size={20} color="#4F8EF7" />
                    <Text style={{ fontSize: 16, marginLeft: 10 }}>Block User</Text>
                </Pressable>
                {/*<Pressable onPress={() => { CBottomSheet.hide(); navigation.navigate("ReportUser", { userId: getUser2Deets?.u2id }); }}
                    style={{ paddingHorizontal: 10, paddingVertical: 15, flexDirection: "row", alignItems: "center" }}>
                    <IonIcon name="warning-outline" size={20} color="#4F8EF7" />
                    <Text style={{ fontSize: 16, marginLeft: 10 }}>Report User</Text>
                </Pressable>*/}
            </View></>),

        isLocalFile: (item: any) => {
            if (!item) return false;
            const uri = item.uri || item.p;
            return typeof uri === "string" && uri.startsWith("file://");
        }
    };

    type UploadDescriptor = {
        uri: string;
        name: string;
        type: string;
        mediaType: 'img' | 'video' | 'audio';
        targetPath: string;
        meta: {
            w?: number | null;
            h?: number | null;
            size?: number | null;
            d?: number | null;
            original?: string | null;
        };
    };

    type UploadedMedia = {
        mediaType: UploadDescriptor['mediaType'];
        src: {
            p: string;
            w?: number | null;
            h?: number | null;
            size?: number | null;
            d?: number | null;
            original?: string | null;
        };
        relativePath: string;
        token?: string;
    };

    const encodeFilePath = (filepath: string) => filepath.split('/').map(encodeURIComponent).join('/');

    const buildUploadTarget = (rawName: string | null | undefined, mediaType: UploadDescriptor['mediaType']) => {
        const fallbackExt = mediaType === 'audio'
            ? 'm4a'
            : (mediaType === 'video' ? 'mp4' : 'jpg');

        // Always use generated name instead of the original filename
        const generatedName = `${funt.matchId}_${Date.now()}_${help.randomAlphanumeric(30, 7)}`;

        // For audio files, use .m4a extension.
        const finalName = mediaType === 'audio'
            ? `${generatedName}.m4a`
            : `${generatedName}.${fallbackExt}`;

        return {
            name: finalName,
            path: `/convo_files/${mediaType}/${finalName}`,
        };
    };

    const requestPresignedUpload = async (filepath: string, contentType: string) => {
        console.log("zzzzzzzz", `${img_domain}/api/generate-upload-url`)
        const data = await _http_request({
            customApiUrl: `${img_domain}/api/generate-upload-url`,
            reqType: 'POST',
            bodyArray: {
                filepath,
                contentType,
            },
        });
        if (!data?.url) {
            throw new Error(data?.error ?? 'Unable to generate upload URL');
        }
        return data;
    };
    console.log(getUser2Deets)
    const uploadWithPresigned = async (descriptor: UploadDescriptor): Promise<UploadedMedia> => {
        // Fix content type for Android audio files
        let contentType = descriptor.type;

        // Android records as mp4 but it's actually AAC audio in MP4 container
        if (descriptor.mediaType === 'audio' && descriptor.name.endsWith('.mp4')) {
            contentType = 'audio/mp4'; // or 'audio/aac'
        }
        console.log("aaaaaaa")
        const presigned = await requestPresignedUpload(descriptor.targetPath, contentType);
        console.log("bbbbbbb", presigned.url)
        // Create FormData
        const formData = new FormData();

        // Create a file object with correct type
        const fileObj = {
            uri: descriptor.uri,
            type: contentType,
            name: descriptor.name
        } as any;

        formData.append('file', fileObj);
        try {
            const uploadResp = await fetch(presigned.url, {
                method: 'PUT',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!uploadResp.ok) {
                const errorText = await uploadResp.text();
                throw new Error(`Upload failed: ${uploadResp.status} - ${errorText}`);
            }

            const encodedPath = encodeFilePath(descriptor.targetPath);

            console.log("cccccccc")
            return {
                mediaType: descriptor.mediaType,
                src: {
                    p: encodedPath,
                    w: descriptor.meta.w ?? null,
                    h: descriptor.meta.h ?? null,
                    size: descriptor.meta.size ?? null,
                    d: descriptor.meta.d ?? null,
                },
                relativePath: descriptor.targetPath
            };
        } catch (error) {
            logReport({
                url: presigned.url,
                type: "http",
                useraction: "upload convo images | presigned url",
                logMessage: 'Unable error.',
                stackTrace: error
            })
            throw error;
        }
    };

    useEffect(() => {
        Loaderx.show();
        // get convo
        (async () => {
            await _http_request({
                customApiUrl: hostServer() + "/api/core/v1/getConversation",
                reqType: 'POST', bodyArray: {
                    matchID: funt.matchId,
                }
            }).then((response) => {
                //console.log(response)
                if (response?.code === 200) {
                    setConversations(response?.chatsMessageListings?.reverse() ?? getConversations);
                    setUser2Deets(response?.u2deets ?? getUser2Deets);
                    setConvoStarter(response?.convostarter ?? getConvoStarter);
                    convoHelper.matchId.set(funt.matchId);
                } else if (response !== null) {
                    Alert.alert('Error!', response?.message);
                }
            }).finally(() => {
                setTimeout(() => {
                    Loaderx.hide();
                }, 1000);
            });
        })();

        return () => {
            convoHelper.matchId.set(null);
        }
    }, [reloadIfRealtimeData_File]);

    const [recorderInitialized, setRecorderInitialized] = useState(false);

    // Update the useEffect cleanup:
    useEffect(() => {
        return () => {
            // Use a timeout to ensure any pending operations complete
            setTimeout(() => {
                try {
                    if (isRecording) {
                        Sound.stopRecorder().catch(() => { });
                    }
                    Sound.stopPlayer().catch(() => { });
                } catch { }

                Sound.removeRecordBackListener();
                Sound.removePlayBackListener();
                Sound.removePlaybackEndListener();
            }, 100);
        };
    }, []);

    // Add a function to safely handle audio cleanup
    const safeStopAllAudio = async () => {
        try {
            // Stop recording if active
            if (isRecording) {
                await Sound.stopRecorder().catch(() => { });
                setIsRecording(false);
            }

            // Stop playback if active
            if (audioPlayback.isPlaying) {
                await Sound.stopPlayer().catch(() => { });
                setAudioPlayback({
                    id: null,
                    position: 0,
                    duration: 0,
                    isPlaying: false
                });
            }

            // Remove all listeners
            Sound.removeRecordBackListener();
            Sound.removePlayBackListener();
            Sound.removePlaybackEndListener();
        } catch (error) {
            console.log('Error in safeStopAllAudio:', error);
        }
    };

    // Update the audio playback function with better error handling:
    const handleAudioPress = async (messageId: string, uri?: string | null) => {
        const playbackUri = resolvePlaybackUri(uri ?? null);
        if (!playbackUri) {
            Toastx.show({
                message: 'Audio file not available',
                type: 'info'
            });
            return;
        }

        // If same audio is playing, pause it
        if (audioPlayback.id === messageId && audioPlayback.isPlaying) {
            try {
                await Sound.pausePlayer();
                setAudioPlayback(prev => ({ ...prev, isPlaying: false }));
            } catch (error) {
                console.log('Error pausing player:', error);
                setAudioPlayback({ id: null, position: 0, duration: 0, isPlaying: false });
            }
            return;
        }

        // If different audio, stop current and play new
        try {
            await safeStopAllAudio();

            await Sound.startPlayer(playbackUri);
            setAudioPlayback({
                id: messageId,
                position: 0,
                duration: 0,
                isPlaying: true
            });

            Sound.addPlayBackListener((e) => {
                setAudioPlayback({
                    id: messageId,
                    position: e.currentPosition ?? 0,
                    duration: e.duration ?? 0,
                    isPlaying: true
                });
            });

            Sound.addPlaybackEndListener(() => {
                setAudioPlayback({
                    id: null,
                    position: 0,
                    duration: 0,
                    isPlaying: false
                });
            });

        } catch (error) {
            console.log('Error playing audio:', error);
            Toastx.show({
                message: 'Unable to play audio',
                type: 'error'
            });
            setAudioPlayback({ id: null, position: 0, duration: 0, isPlaying: false });
        }
    };



    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitleAlign: 'left',
            headerTitle: () => <View style={{ alignItems: "center", flexDirection: "row", gap: 5 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', textTransform: "capitalize" }}>{getUser2Deets?.fullname}</Text>
                {getUser2Deets?.verified ? <IonIcon name="checkmark-done-circle-sharp" size={20} color="#4F8EF7" /> : <></>}
            </View>,

            headerRight: () => <View style={{ paddingRight: 5, flexDirection: "row", alignItems: "center", gap: 18 }}>

                {/* Voice Call */}
                <Pressable
                    style={{ padding: 4 }}
                    onPress={() => {
                        // open voice call screen or function
                        console.log("voice call");
                    }}
                >
                    <IonIcon name="call-outline" size={25} color="#4F8EF7" />
                </Pressable>

                {/* Video Call */}
                <Pressable
                    style={{ padding: 4 }}
                    onPress={() => {
                        // open video call screen or function
                        console.log("video call");
                    }}
                >
                    <IonIcon name="videocam-outline" size={26} color="#4F8EF7" />
                </Pressable>

                {/* More Options */}
                <Pressable
                    style={{ padding: 4 }}
                    onPress={() => {
                        bottomSheetRef_convotools?.current?.open({
                            onClose: () => { },
                            sheetHeight: 0.2,
                            closeLabel: <Icon name="close" size={20} />,

                        });
                    }}
                >
                    <IonIcon name="ellipsis-horizontal" size={25} color="#4F8EF7" />
                </Pressable>

            </View>

        });
    }, [getUser2Deets]);



    const sendMessage = async (presetText?: string) => {
        if (isUploadingMedia) return;

        const messageText = (presetText ?? inputText).trim();
        const hasMedia = getInputImageVideo.length > 0;
        const hasAudio = Boolean(getInputAudio);
        const hasText = messageText.length > 0;

        if (!hasMedia && !hasAudio && !hasText) {
            return;
        }

        const uploadDescriptors: UploadDescriptor[] = [];

        // Process images/videos
        getInputImageVideo.forEach((file, index) => {
            const mediaType: UploadDescriptor['mediaType'] = (file.type ?? '').startsWith('video') ? 'video' : 'img';
            const { name, path } = buildUploadTarget(file.fileName ?? `media_${index}`, mediaType);
            if (!file.uri) return;
            uploadDescriptors.push({
                uri: file.uri,
                name,
                type: file.type ?? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
                mediaType,
                targetPath: path,
                meta: {
                    w: file.width ?? null,
                    h: file.height ?? null,
                    size: file.fileSize ?? null,
                    d: file.duration ? file.duration * 1000 : null,
                    original: file.fileName ?? null,
                },
            });
        });

        // Process audio
        if (hasAudio && getInputAudio) {
            const { name, path } = buildUploadTarget(getInputAudio.split('/').pop() ?? `voice_note_${Date.now()}.m4a`, 'audio');
            uploadDescriptors.push({
                uri: getInputAudio,
                name,
                type: 'audio/m4a',
                mediaType: 'audio',
                targetPath: path,
                meta: {
                    d: recordingMs,
                    size: null,
                    original: name,
                },
            });
        }

        setConvoSendingstatus("sending...");
        setIsUploadingMedia(true);

        let uploadedMedia: UploadedMedia[] = [];
        try {
            for (const descriptor of uploadDescriptors) {
                console.log("111111")
                const aa = await uploadWithPresigned(descriptor);
                console.log("222222")
                uploadedMedia.push(aa);
            }
        } catch (error) {
            Toastx.show({ message: 'Unable to upload media. Please try again.', type: 'error' });
            console.log("j,", error);
            setConvoSendingstatus(null);
            setIsUploadingMedia(false);
            return;
        }

        // Prepare file_meta array for backend
        const file_meta: any[] = uploadedMedia.map((item) => ({
            path: item.relativePath,
            url: item.src.p,
            w: item.src.w ?? null,
            h: item.src.h ?? null,
            size: item.src.size ?? null,
            d: item.src.d ?? null,
            token: item.token ?? null,
        }));

        const hasUploadedVideo = uploadedMedia.some((m) => m.mediaType === 'video');
        const realTimeData_updates = messageText.length > 0 ? messageText : (hasUploadedVideo ? ">>>video" : (uploadedMedia.some(m => m.mediaType === 'img') ? ">>>photo" : (uploadedMedia.some(m => m.mediaType === 'audio') ? ">>>audio" : "")));

        // Clear input states
        setInputImageVideo([]);
        setInputText('');
        setInputAudio(null);

        // Optimistically add messages to UI
        let outgoingMessages: convoInterface[] = [];

        // Add media messages
        if (uploadedMedia.length > 0) {
            // Group by media type
            const imagesVideos = uploadedMedia.filter((m) => m.mediaType === 'img' || m.mediaType === 'video');
            const audios = uploadedMedia.filter((m) => m.mediaType === 'audio');

            if (imagesVideos.length > 0) {
                const hasVideo = imagesVideos.some(m => m.mediaType === 'video');
                outgoingMessages.push({
                    messageId: help.randomAlphanumeric(29),
                    fromMe: true,
                    type: hasVideo ? "video" : "image",
                    message: null,
                    src: imagesVideos.map((m) => m.src)
                });
            }

            if (audios.length > 0) {
                outgoingMessages.push({
                    messageId: help.randomAlphanumeric(29),
                    fromMe: true,
                    type: "audio",
                    message: null,
                    src: audios.map((m) => m.src)
                });
            }
        }

        // Add text message if exists
        if (messageText.length > 0) {
            outgoingMessages.push({
                messageId: help.randomAlphanumeric(29),
                fromMe: true,
                type: "text",
                message: messageText,
                src: null
            });
        }

        // Update UI immediately
        setConversations((prev) => [...outgoingMessages, ...prev]);

        try {
            const response = await _http_request({
                customApiUrl: hostServer() + "/api/core/v1/pushConversation",
                reqType: 'POST',
                bodyArray: {
                    messagee: messageText,
                    match_id: funt.matchId,
                    file_meta: file_meta.length > 0 ? file_meta : undefined
                }
            });

            if (response?.code === 200) {
                const jy = llStorage.currentProfile.get()?.currentUser?.user_fullname ?? "";
                setConvoSendingstatus("sent");
                if (getUser2Deets?.uid) {
                    SocketClient.emit("/push/" + getUser2Deets?.uid, {
                        matchId: funt.matchId,
                        type: "single-convo",
                        payload:
                        {
                            firstName: (jy.split(" ")?.[0]) ?? jy,
                            lastMessage: realTimeData_updates,
                        }
                    });
                    const d = new Date();
                    const hours24 = d.getHours();
                    const hours12 = hours24 % 12 || 12;
                    const minutes = String(d.getMinutes()).padStart(2, "0");
                    const ampm = hours24 >= 12 ? "pm" : "am";
                    setConvoSendingstatus(`${hours12}:${minutes} ${ampm} delivered`);
                }
            } else if (response !== null) {
                Alert.alert('Error!', response?.message ?? 'Unable to send message.');
                // Optionally remove optimistic update on error
                setConversations((prev) => prev.filter(msg =>
                    !outgoingMessages.some(out => out.messageId === msg.messageId)
                ));
                setConvoSendingstatus(null);
            } else {
                setConvoSendingstatus(null);
            }
        } catch (error) {
            //console.error('Send message error:', error);
            // Remove optimistic update on error
            setConversations((prev) => prev.filter(msg =>
                !outgoingMessages.some(out => out.messageId === msg.messageId)
            ));
            Alert.alert('Error!', 'Failed to send message.');
            setConvoSendingstatus(null);
        } finally {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            setRecordingMs(0);
            setIsRecording(false);
            setIsUploadingMedia(false);
        }
    };

    const flatListRef = useRef<FlatList>(null);
    const renderMessage = ({ item }: { item: convoInterface }) => {

        // Handle different message types
        const isImage = item.type === 'image' && item.src && item.src.length > 0;
        const isVideo = item.type === 'video' && item.src && item.src.length > 0;
        const isAudio = item.type === 'audio' && item.src && item.src.length > 0;
        const isText = item.type === 'text';
        const isFile = item.type === 'file' && item.src && item.src.length > 0;

        const firstSrc = Array.isArray(item?.src) ? item.src?.[0] : null;
        const firstSrcDuration = firstSrc?.d != null ? Number(firstSrc.d) : 0;
        const firstSrcSize = firstSrc?.size != null ? Number(firstSrc.size) : null;

        // Audio playback logic
        const audioUri = isAudio ? resolveMediaUri(firstSrc) : null;
        const isCurrentAudio = audioPlayback.id === item.messageId;
        const durationMs = isCurrentAudio ? (audioPlayback.duration || audioPlayback.position) : firstSrcDuration;
        const playbackPositionMs = isCurrentAudio ? audioPlayback.position : 0;
        const durationFormatted = durationMs ? formatDurationShort(durationMs) : null;
        const playbackLabels = buildPlaybackLabels(playbackPositionMs, durationMs);
        const audioDisplayLabel = isCurrentAudio && playbackLabels.durationLabel
            ? `${playbackLabels.posLabel} / ${playbackLabels.durationLabel}`
            : (durationFormatted ?? formatDurationLabel(durationMs));

        const fileSizeLabel = formatBytes(firstSrcSize);
        const fileOriginalName = firstSrc?.original;


        return (
            <View style={[styles.conversation_message_container, item.fromMe ? styles.conversation_currentUserMessage : styles.conversation_nextUserMessage]}>
                <View style={[styles.conversation_messageBubble, {
                    borderBottomRightRadius: (item.fromMe) ? 0 : 10,
                    borderBottomLeftRadius: (item.fromMe) ? 10 : 0,
                    backgroundColor: (isImage || isVideo) ? "#a1a1a111" : ((item.fromMe) ? '#E5E5EA' : '#0078fe')
                }]}>
                    {isText && <Text style={[styles.conversation_messageText, {
                        color: (item.fromMe) ? "#000" : "#fff"
                    }]}>{item?.message}</Text>}

                    {isVideo && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                            <TouchableOpacity onPress={() => {
                                const vidUri = resolveMediaUri(firstSrc);
                                if (vidUri) Linking.openURL(vidUri);
                            }} style={{ backgroundColor: item.fromMe ? '#fff' : '#1b5ec766', padding: 10, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <MaterialCommunityIcons name="play-circle" size={22} color={item.fromMe ? "#000" : "#fff"} />
                                <Text style={{ color: item.fromMe ? "#000" : "#fff" }}>
                                    Video{fileSizeLabel ? ` · ${fileSizeLabel}` : ''}{durationFormatted ? ` · ${durationFormatted}` : ''}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isFile && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                            <TouchableOpacity onPress={() => {
                                const fileUri = resolveMediaUri(firstSrc);
                                if (fileUri) Linking.openURL(fileUri);
                            }} style={{ backgroundColor: item.fromMe ? '#fff' : '#1b5ec766', padding: 10, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <MaterialCommunityIcons name="file" size={20} color={item.fromMe ? "#000" : "#fff"} />
                                <Text style={{ color: item.fromMe ? "#000" : "#fff" }}>
                                    {fileOriginalName ?? 'File'}{fileSizeLabel ? ` · ${fileSizeLabel}` : ''}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isAudio && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2, paddingHorizontal: 25 }}>
                            <TouchableOpacity onPress={() => { handleAudioPress(item.messageId, audioUri) }}
                                style={{ backgroundColor: item.fromMe ? '#fff' : '#1b5ec766', padding: 8, borderRadius: 30 }}>
                                <IonIcon name={(isCurrentAudio && audioPlayback.isPlaying) ? "pause" : "play"} size={20} color={item.fromMe ? "#000" : "#fff"} />
                            </TouchableOpacity>
                            <View style={{}}>
                                <Text style={{ color: (item.fromMe) ? "#000" : "#fff", fontWeight: "600" }}>Voice note</Text>
                                <Text style={{ color: (item.fromMe) ? "#333" : "#dbe7ff", fontSize: 12 }}>
                                    {audioDisplayLabel}{fileSizeLabel ? ` · ${fileSizeLabel}` : ''}
                                </Text>
                            </View>
                        </View>
                    )}

                    {isImage && (
                        <View style={{ gap: 5 }}>
                            {(item.src ?? []).map((img, key) => {
                                const originalWidth = img?.w ?? 450;
                                const originalHeight = img?.h ?? 600;
                                const targetHeight = 190;
                                const aspectRatio = originalWidth / originalHeight;
                                const targetWidth = Math.min(targetHeight * aspectRatio, screenWidth);

                                let imgPath = img?.p;
                                if (!funt.isLocalFile(img)) {
                                    imgPath = (img_server + img?.p) || img?.p;
                                    //console.log(imgPath)
                                }

                                return (
                                    <Pressable key={key} style={{ gap: 5 }} onPress={() => {
                                        setFullscreenClickImage(imgPath);
                                    }}>
                                        <FastImage source={{
                                            cache: FastImage.cacheControl.immutable,
                                            uri: imgPath
                                        }} style={{ width: targetWidth, height: targetHeight }} resizeMode="contain" />
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>
        );
    };
    const pendingPlayback = audioPlayback.id === 'pending-audio';
    const pendingPositionMs = pendingPlayback ? audioPlayback.position : recordingMs;
    const pendingDurationMs = pendingPlayback ? (audioPlayback.duration || recordingMs) : recordingMs;
    const pendingLabels = buildPlaybackLabels(pendingPositionMs, pendingDurationMs);
    const pendingTimeLabel = (pendingPlayback && pendingLabels.durationLabel)
        ? `${pendingLabels.posLabel} / ${pendingLabels.durationLabel}`
        : pendingLabels.posLabel;
    console.log(img_server + getUser2Deets?.image?.p)
    return (<>
        <View style={[styles.container, {}]}>

            <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 105 : 0}
                    style={{ flex: 1 }} >

                    <View style={{ paddingVertical: 5 }}>
                        <Pressable onPress={() => { navigation.push(namer.navigation.peoplesOnePerson, { alreadyLiked: true, likedMatchedId: funt.matchId, getOnePersonId: getUser2Deets?.uid }); }}
                            style={{ backgroundColor: '#f3f6ff', borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            {getUser2Deets?.image?.p ? <FastImage source={{ uri: img_server + getUser2Deets?.image?.p, cache: FastImage.cacheControl.immutable }}
                                style={{ width: 80, height: 80, borderRadius: 50 }} /> : <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: '#d7def5' }} />}
                            <View style={{ flex: 1, gap: 4 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', textTransform: "capitalize" }}>{getUser2Deets?.fullname || "Your match"}</Text>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                    {getUser2Deets?.city && <Text style={{ color: "#444" }}><IonIcon name="location-outline" size={14} color="#4F8EF7" /> {getUser2Deets?.city}</Text>}
                                    {getUser2Deets?.verified && <View style={{ backgroundColor: "#e8f1ff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4 }}>
                                        <IonIcon name="shield-checkmark" size={14} color="#4F8EF7" />
                                        <Text style={{ fontSize: 12, color: "#4F8EF7" }}>Verified</Text>
                                    </View>}
                                </View>
                                <Text style={{ color: "#555", fontSize: 12 }}>Tap to view profile or read bio for conversation idea.</Text>
                            </View>
                            <IonIcon name="chevron-forward" size={20} color="#4F8EF7" />
                        </Pressable>


                    </View>

                    <FlatList ref={flatListRef} data={getConversations}
                        inverted
                        keyExtractor={item => item.messageId}
                        renderItem={renderMessage}
                        initialNumToRender={4} maxToRenderPerBatch={4} windowSize={4}
                        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ gap: 10 }}
                        ListHeaderComponent={getconvoSendingstatus && <Text style={{ textAlign: "right", fontSize: 11 }}>{getconvoSendingstatus}</Text>}

                        ListEmptyComponent={<View style={{ paddingVertical: 20, alignItems: "center", width: '100%' }}>
                            <FlatList
                                ref={starterCarouselRef}
                                data={getConvoStarter}
                                keyExtractor={(item, index) => `${item}-${index}`}
                                renderItem={({ item }) => (
                                    <Pressable
                                        onPress={() => handleInsertPrompt(item)}
                                        style={{
                                            width: screenWidth * 0.78,
                                            paddingVertical: 16,
                                            paddingHorizontal: 18,
                                            backgroundColor: '#0f172a',
                                            borderRadius: 16,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            shadowColor: '#000',
                                            shadowOpacity: 0.1,
                                            shadowRadius: 10,
                                            shadowOffset: { width: 0, height: 4 },
                                        }}>
                                        <Text style={{ color: '#fff', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>{item}</Text>
                                        <Text style={{ color: '#cbd5e1', fontSize: 12, marginTop: 10 }}>Tap to use this prompt</Text>
                                    </Pressable>
                                )}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                pagingEnabled
                                snapToAlignment="center"
                                decelerationRate="fast"
                                onViewableItemsChanged={starterViewable}
                                viewabilityConfig={starterViewConfig}
                                contentContainerStyle={{ paddingHorizontal: ((screenWidth * 0.1) / 2), gap: 10 }}
                            />
                            {Array.isArray(getConvoStarter) && getConvoStarter.length > 1 && (
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                                    {getConvoStarter.map((_: any, idx: number) => (
                                        <View key={idx} style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: idx === starterIndex ? '#0ea5e9' : '#e2e8f0'
                                        }} />
                                    ))}
                                </View>
                            )}
                        </View>}
                        onLayout={() => {
                            if (flatListRef.current && getConversations.length > 0) {
                                flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
                            }
                        }}
                    />

                    {getInputImageVideo?.length > 0 && (
                        <View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ marginVertical: 4 }}
                                contentContainerStyle={{
                                    gap: 4,
                                    paddingHorizontal: 6, // 添加水平内边距
                                    alignItems: 'center'  // 垂直居中
                                }}
                            >
                                {getInputImageVideo?.map((ag, index) => {
                                    const originalWidth = ag?.width ?? 450;
                                    const originalHeight = ag?.height ?? 600;
                                    const targetHeight = 190; // uniform display height
                                    const aspectRatio = originalWidth / originalHeight;
                                    const targetWidth = Math.min(targetHeight * aspectRatio, screenWidth * .8);

                                    return (
                                        <Pressable key={index} onPress={() => { if (ag?.uri) setFullscreenClickImage(ag?.uri); }}>
                                            <ImageBackground
                                                style={{
                                                    position: 'relative',
                                                    borderRadius: 6,
                                                    overflow: 'hidden', // 确保圆角生效
                                                    width: targetWidth,
                                                    height: targetHeight,
                                                }}
                                                source={{ uri: ag?.uri }} >
                                                <TouchableOpacity
                                                    onPress={() => setInputImageVideo((prev) => prev?.filter((_, i) => i !== index))}
                                                    style={{
                                                        backgroundColor: 'rgba(0,0,0,0.65)',
                                                        borderRadius: 12,
                                                        width: 24,
                                                        height: 24,
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        position: 'absolute',
                                                        top: 6,
                                                        right: 6,
                                                        zIndex: 10,
                                                        shadowColor: '#000',
                                                        shadowOffset: { width: 0, height: 2 },
                                                        shadowOpacity: 0.15,
                                                        shadowRadius: 3,
                                                        elevation: 3,
                                                    }}
                                                >
                                                    <Icon name="close" color="#fff" size={16} />
                                                </TouchableOpacity>
                                            </ImageBackground>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>)}

                    {(isRecording || getInputAudio) &&
                        <View style={{ marginHorizontal: 6, marginBottom: 8, padding: 12, borderRadius: 14, backgroundColor: '#f0f3ff', flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                            <View style={{ width: 42, height: 42, borderRadius: 30, backgroundColor: isRecording ? '#ffdad9' : '#dfe8ff', alignItems: 'center', justifyContent: 'center' }}>
                                <MaterialCommunityIcons name={isRecording ? "record-circle" : "microphone-outline"} size={22} color={isRecording ? "#d00" : "#3b65ff"} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: '600' }}>{isRecording ? "Recording..." : "Voice note ready"}</Text>
                                <Text style={{ color: '#444' }}>{pendingTimeLabel}</Text>
                            </View>
                            {getInputAudio &&
                                <TouchableOpacity onPress={() => handleAudioPress('pending-audio', getInputAudio)} style={{ padding: 6 }}>
                                    <MaterialCommunityIcons name={(audioPlayback.id === 'pending-audio' && audioPlayback.isPlaying) ? "pause-circle" : "play-circle"} size={28} color="#4F8EF7" />
                                </TouchableOpacity>
                            }

                            {!getInputAudio && <TouchableOpacity onPress={() => { stopVoiceNote(true) }} style={{ padding: 6 }}>
                                <MaterialCommunityIcons name="stop-circle" size={26} color={"#d00"} />
                            </TouchableOpacity>}

                            {getInputAudio &&
                                <TouchableOpacity onPress={clearVoiceNote} style={{ padding: 6 }}>
                                    <Icon name="close" size={20} color="#555" />
                                </TouchableOpacity>
                            }
                        </View>
                    }

                    <View style={[styles.conversation_textInputContainer, { marginVertical: 5 }]}>
                        <TouchableOpacity onPress={async () => {
                            //console.log(CONFIG.imgSelectUploadLimit - (getInputImageVideo.length || 0))
                            const hs = await mediaHandler.handleSelectFromGallery({
                                mediaType: 'photo',
                                includeBase64: false,
                                selectionLimit: Math.max(1, CONFIG.imgSelectUploadLimit - getInputImageVideo.length)
                            });
                            if (hs) {
                                if ((getInputImageVideo.length + hs.length) > CONFIG.imgSelectUploadLimit) {
                                    Toastx.show({
                                        message: "You are limited to " + CONFIG.imgSelectUploadLimit + " photos/video",
                                        type: "info"
                                    });
                                } else {
                                    setInputImageVideo(prev => {
                                        const incoming = (hs || []).filter(
                                            item => !prev.some(p => p.uri === item.uri)
                                        );
                                        //console.log(incoming);
                                        return [...prev, ...incoming].slice(0, CONFIG.imgSelectUploadLimit);
                                    });
                                }
                            }
                        }} style={{ paddingHorizontal: 6 }}>
                            <MaterialCommunityIcons name="camera" size={25} color="#4F8EF7" />
                        </TouchableOpacity>
                        <TouchableOpacity disabled={voiceNoteLoading} onPress={() => toggleVoiceNote()} style={{ paddingHorizontal: 6 }}>
                            <MaterialCommunityIcons name={isRecording ? "stop-circle" : "microphone"} size={25} color={isRecording ? "#d00" : "#4F8EF7"} />
                        </TouchableOpacity>
                        <TextInput ref={inputTextRef} style={styles.conversation_textInput} value={inputText} onChangeText={setInputText} placeholder="Send a message" placeholderTextColor="#aaa" multiline />
                        <TouchableOpacity disabled={(inputText.trim() || (getInputImageVideo.length > 0) || getInputAudio) ? false : true} onPress={() => sendMessage()} style={{ paddingHorizontal: 6, justifyContent: 'center' }}>
                            <MaterialCommunityIcons name="send" size={25} color="#4F8EF7" style={{ opacity: (inputText.trim() || (getInputImageVideo.length > 0) || getInputAudio) ? 1 : 0.4 }} />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>

        <CBottomSheet ref={bottomSheetRef_convotools} >
            {funt.convoTools}
        </CBottomSheet>

        <FullScreenImageModal
            visible={!!getFullscreenClickImage}
            uri={getFullscreenClickImage}
            onClose={() => setFullscreenClickImage(null)} />
    </>
    );
};
