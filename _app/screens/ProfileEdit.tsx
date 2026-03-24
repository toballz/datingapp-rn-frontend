import React, {
    useState, useLayoutEffect, useRef, useMemo,
    useCallback, useEffect,
} from 'react';
import {
    View, Text, TextInput, Image, Pressable,
    KeyboardAvoidingView, Platform, TouchableOpacity,
    StyleSheet, LayoutAnimation, UIManager,
} from 'react-native';
import RNFS from 'react-native-fs';
import { Loaderx, bottomsheet_renderBackdrop } from '../funcs/functions_stateful';
import { ScrollView } from 'react-native-gesture-handler';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    runOnJS,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import IIcon from 'react-native-vector-icons/Ionicons';
import MIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import RadioGroup from 'react-native-radio-buttons-group';
import { styles, namer, colors } from '../funcs/static';
import { SafeAreaView } from 'react-native-safe-area-context';
import { _http_request, cacheStorage, help, hostServer, llStorage, mediaHandler, sleep, uploadHandler } from '../funcs/functions';
import { useHeaderHeight } from '@react-navigation/elements';
import { AccordionItem } from '../funcs/customAccordion';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Toastx } from '../funcs/customNotification';
import LinearGradient from 'react-native-linear-gradient';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Constants ───────────────────────────────────────────────────────────────
const GAP = 5;
const MAX_PHOTOS = 6;
const MAX_PROMPTS = 3;
const MAX_INTERESTS = 15;

// ─── Types ───────────────────────────────────────────────────────────────────
interface PhotoItem {
    p?: string;
    uri?: string;
    local?: boolean;
    w?: number;
    h?: number;
}

interface CellDim {
    w: number;
    h: number;
    x: number;
    y: number;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function getCellDims(containerWidth: number): CellDim[] {
    const colW = (containerWidth - GAP) / 2;
    const smallH = colW * 0.65;
    const bigH = smallH * 2 + GAP;
    const bottomH = smallH;
    const thirdColW = (containerWidth - GAP * 2) / 3;
    return [
        { w: colW, h: bigH, x: 0, y: 0 },
        { w: colW, h: smallH, x: colW + GAP, y: 0 },
        { w: colW, h: smallH, x: colW + GAP, y: smallH + GAP },
        { w: thirdColW, h: bottomH, x: 0, y: bigH + GAP },
        { w: thirdColW, h: bottomH, x: thirdColW + GAP, y: bigH + GAP },
        { w: thirdColW, h: bottomH, x: (thirdColW + GAP) * 2, y: bigH + GAP },
    ];
}

/** Returns the cell index whose bounding rect contains (px, py), or -1. */
function hitTestCell(cells: CellDim[], px: number, py: number): number {
    for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return i;
    }
    return -1;
}

function padImages(images: PhotoItem[]): PhotoItem[] {
    const arr = [...images];
    while (arr.length < MAX_PHOTOS) arr.push({});
    return arr.slice(0, MAX_PHOTOS);
}

function isEmptySlot(img: PhotoItem): boolean {
    return !img?.p && !img?.uri;
}

function getFileExtension(path: string): string {
    const cleaned = path.split('?')[0].split('#')[0];
    const parts = cleaned.split('.');
    if (parts.length < 2) return 'jpg';
    const ext = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
    return ext || 'jpg';
}

function getMimeTypeFromExt(ext: string): string {
    const map: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        bmp: 'image/bmp',
    };
    return map[ext] ?? 'application/octet-stream';
}

function encodeFilePath(filepath: string): string {
    return filepath.split('/').map(encodeURIComponent).join('/');
}

// ─── DraggablePhoto ───────────────────────────────────────────────────────────
// Defined at module level so React's Rules of Hooks are never violated.

interface DraggablePhotoProps {
    image: PhotoItem;
    slotIndex: number;
    cellWidth: number;
    cellHeight: number;
    x: number;
    y: number;
    imageUri: string;
    isDropTarget: boolean;
    onPress: (index: number) => void;
    onRemove: (index: number) => void;
    onDragStart: (index: number) => void;
    onDragMove: (index: number, tx: number, ty: number) => void;
    onDragEnd: (index: number, tx: number, ty: number) => void;
}

const DraggablePhoto = React.memo(({
    image, slotIndex, cellWidth, cellHeight, x, y,
    imageUri, isDropTarget,
    onPress, onRemove, onDragStart, onDragMove, onDragEnd,
}: DraggablePhotoProps) => {
    const empty = isEmptySlot(image);

    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const zIdx = useSharedValue(1);
    const shadowOpacity = useSharedValue(0);

    const gesture = Gesture.Pan()
        .minDistance(8)
        .enabled(!empty)
        .onStart(() => {
            scale.value = withSpring(1.07, { damping: 14, stiffness: 200 });
            shadowOpacity.value = withTiming(0.4, { duration: 150 });
            zIdx.value = 100;
            runOnJS(onDragStart)(slotIndex);
        })
        .onUpdate(e => {
            translateX.value = e.translationX;
            translateY.value = e.translationY;
            runOnJS(onDragMove)(slotIndex, e.translationX, e.translationY);
        })
        .onEnd(e => {
            translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
            translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
            scale.value = withSpring(1);
            shadowOpacity.value = withTiming(0, { duration: 200 });
            zIdx.value = 1;
            runOnJS(onDragEnd)(slotIndex, e.translationX, e.translationY);
        })
        .onFinalize(() => {
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
            scale.value = withSpring(1);
            shadowOpacity.value = withTiming(0);
            zIdx.value = 1;
        });

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        zIndex: zIdx.value,
        shadowOpacity: shadowOpacity.value,
        elevation: shadowOpacity.value > 0.1 ? 10 : 0,
    }));

    return (
        <Animated.View style={[
            photoStyles.wrapper,
            { left: x, top: y, width: cellWidth, height: cellHeight },
            animStyle,
        ]}>
            <GestureDetector gesture={gesture}>
                <Animated.View style={{ flex: 1 }}>
                    <Pressable
                        style={[
                            photoStyles.cell,
                            empty && photoStyles.emptyCell,
                            isDropTarget && (empty ? photoStyles.dropTargetEmpty : photoStyles.dropTargetFilled),
                        ]}
                        onPress={() => onPress(slotIndex)}
                    >
                        {!empty ? (
                            <>
                                <Image
                                    key={imageUri || `empty-${slotIndex}`}
                                    source={{ uri: imageUri }}
                                    style={photoStyles.img}
                                    resizeMode="cover"
                                />

                                {/* Drop-target tint overlay */}
                                {isDropTarget && <View style={photoStyles.dropOverlay} />}

                                {/* Remove button */}
                                <Pressable
                                    style={photoStyles.removeBtn}
                                    onPress={() => onRemove(slotIndex)}
                                    hitSlop={6}
                                >
                                    <View style={photoStyles.removeBtnInner}>
                                        <IIcon name="close" size={12} color="#ff4444" />
                                    </View>
                                </Pressable>

                                {/* Drag handle dots */}
                                <View style={photoStyles.dragHandle} pointerEvents="none">
                                    {[...Array(6)].map((_, i) => (
                                        <View key={i} style={photoStyles.dragDot} />
                                    ))}
                                </View>

                                {/* Main badge */}
                                {slotIndex === 0 && (
                                    <View style={photoStyles.mainBadge}>
                                        <MIcons name="star" size={10} color="#fff" />
                                        <Text style={photoStyles.mainBadgeText}>Main</Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={photoStyles.emptyContent}>
                                {isDropTarget
                                    ? <IIcon name="swap-horizontal-outline" size={24} color="#4f8ef7" />
                                    : <IIcon name="add" size={26} color="#c8c8c8" />
                                }
                            </View>
                        )}
                    </Pressable>
                </Animated.View>
            </GestureDetector>
        </Animated.View>
    );
});

const photoStyles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
    },
    cell: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#f2f2f2',
    },
    emptyCell: {
        borderWidth: 1.5,
        borderColor: '#dedede',
        borderStyle: 'dashed',
        backgroundColor: '#fafafa',
    },
    dropTargetFilled: {
        borderWidth: 2.5,
        borderColor: '#4f8ef7',
    },
    dropTargetEmpty: {
        borderWidth: 2.5,
        borderColor: '#4f8ef7',
        borderStyle: 'solid',
        backgroundColor: '#eef3fe',
    },
    img: { width: '100%', height: '100%' },
    dropOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(79,142,247,0.22)',
    },
    emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    removeBtn: {
        position: 'absolute', top: 5, right: 5, zIndex: 10,
    },
    removeBtnInner: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2, shadowRadius: 3,
    },
    dragHandle: {
        position: 'absolute', bottom: 6, right: 6,
        flexDirection: 'row', flexWrap: 'wrap', width: 14, gap: 2.5,
        opacity: 0.65,
    },
    dragDot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: '#fff' },
    mainBadge: {
        position: 'absolute', bottom: 7, left: 7,
        backgroundColor: 'rgba(0,0,0,0.42)',
        borderRadius: 8,
        paddingHorizontal: 7, paddingVertical: 3,
        flexDirection: 'row', alignItems: 'center', gap: 3,
    },
    mainBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
});

// ─── Photo Grid ───────────────────────────────────────────────────────────────

interface PhotoGridProps {
    images: PhotoItem[];
    containerWidth: number;
    dropTargetIndex: number | null;
    getImageUri: (index: number) => string;
    onPress: (index: number) => void;
    onRemove: (index: number) => void;
    onDragStart: (index: number) => void;
    onDragMove: (index: number, tx: number, ty: number) => void;
    onDragEnd: (index: number, tx: number, ty: number) => void;
    onLayout: (width: number) => void;
}

const PhotoGrid = React.memo(({
    images, containerWidth, dropTargetIndex, getImageUri,
    onPress, onRemove, onDragStart, onDragMove, onDragEnd, onLayout,
}: PhotoGridProps) => {
    if (containerWidth === 0) {
        return (
            <View
                onLayout={e => onLayout(e.nativeEvent.layout.width)}
                style={{ width: '100%', height: 10 }}
            />
        );
    }

    const cells = getCellDims(containerWidth);
    const bigH = cells[0].h;
    const botH = cells[3].h;
    const total = bigH + GAP + botH;
    const padded = padImages(images);

    return (
        <View
            onLayout={e => {
                const w = Math.floor(e.nativeEvent.layout.width);
                if (w !== containerWidth) onLayout(w);
            }}
            style={{ width: '100%', height: total }}
        >
            {cells.map((cell, idx) => (
                <DraggablePhoto
                    key={`${idx}-${padded[idx]?.p ?? padded[idx]?.uri ?? 'empty'}`}
                    image={padded[idx]}
                    slotIndex={idx}
                    cellWidth={cell.w}
                    cellHeight={cell.h}
                    x={cell.x}
                    y={cell.y}
                    imageUri={getImageUri(idx)}
                    isDropTarget={dropTargetIndex === idx}
                    onPress={onPress}
                    onRemove={onRemove}
                    onDragStart={onDragStart}
                    onDragMove={onDragMove}
                    onDragEnd={onDragEnd}
                />
            ))}
        </View>
    );
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function Screen_editprofile({ navigation }: { navigation: any }) {
    const headerHeight = useHeaderHeight();

    const [getProfile, setProfile] = useState<any>(null);
    const __MAPPER = llStorage.CONFIG.get()?.mapper;

    const imageDomain = __MAPPER?.img_domain?.[0] ?? '';

    const [getProfileEdit, setProfileEdit] = useState({
        images: [] as PhotoItem[],

        // Basic info
        id: null as string | null,
        fullname: "",
        age: null as number | null,
        about: "",
        city: "",

        // Preferences/Attributes
        gender: null as string | null,
        relationshipgoal: null as string | null,
        children: null as string | null,
        smoking: null as string | null,
        drinking: null as string | null,
        pets: null as string | null,
        highEducation: null as string | null,
        ethnicity: null as string | null,
        bodytype: null as string | null,
        religion: null as string | null,
        politicalview: null as string | null,

        // Text fields
        hometown: "",
        schoolattended: "",
        languages: [] as string[],
    });

    // ── Profile state ──────────────────────────────────────────────────────   
    const [getPrompts, setPrompts] = useState<Array<{ q: string; a: string; d: string }>>(
        Array.isArray(getProfile?.user_bio_prompt) ? getProfile.user_bio_prompt : []
    );
    const [getInterests, setInterests] = useState<string[]>(
        Array.isArray(getProfile?.user_bio_interests) ? getProfile.user_bio_interests : []
    );



    // profile
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [profile] = await Promise.all([cacheStorage.getCurrentUserProfile()]);

                if (mounted && profile) {
                    setProfile(profile);
                    setProfileEdit({
                        // Photos
                        images: profile?.profile?.images ?? [],

                        // Basic info
                        id: profile?.profile?.id ?? null,
                        fullname: profile?.profile?.fullname ?? '',
                        age: profile?.profile?.dob ?? null,
                        about: profile?.bio?.about ?? '',
                        city: profile?.profile?.location?.city ?? '',

                        // Preferences/Attributes
                        gender: profile?.bio?.gender ?? null,
                        relationshipgoal: profile?.bio?.relationshipgoal ?? null,
                        children: profile?.bio?.children ?? null,
                        smoking: profile?.bio?.smoking ?? null,
                        drinking: profile?.bio?.drinking ?? null,
                        pets: profile?.bio?.haspet ?? null,
                        highEducation: profile?.bio?.highesteducation ?? null,
                        ethnicity: profile?.bio?.ethnicity ?? null,
                        bodytype: profile?.bio?.bodytype ?? null,
                        religion: profile?.bio?.religion ?? null,
                        politicalview: profile?.bio?.politicalview ?? null,

                        // Text fields
                        hometown: profile?.bio?.hometown ?? '',
                        schoolattended: profile?.bio?.schoolattended ?? '',
                        languages: profile?.bio?.language ?? [],
                    });
                    setPrompts(Array.isArray(profile?.user_bio_prompt) ? profile.user_bio_prompt : []);
                    setInterests(Array.isArray(profile?.user_bio_interests) ? profile.user_bio_interests : []);
                }
            } catch (error) {
                console.error("Error loading profile:", error);
                if (mounted) {
                    setProfile(null);
                }
            }
        })();

        return () => { mounted = false; };
    }, []);
    const updateProfileEdit = useCallback((
        updates:
            Partial<typeof getProfileEdit>
            | ((prev: typeof getProfileEdit) => Partial<typeof getProfileEdit>)
    ) => {
        setProfileEdit(prev => ({
            ...prev,
            ...(typeof updates === 'function' ? updates(prev) : updates),
        }));
    }, []);




    // ── Drag state ─────────────────────────────────────────────────────────
    const [containerWidth, setContainerWidth] = useState(0);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

    // ── Bottom sheet refs ───────────────────────────────────────────────────
    const addNewPrompt_ref = useRef<BottomSheet>(null);
    const addInterests_ref = useRef<BottomSheet>(null);
    const addNewPromptSnapPoints = useMemo(() => ['80%'], []);
    const addInterestsSnapPoints = useMemo(() => ['85%'], []);

    // ── Header ─────────────────────────────────────────────────────────────
    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: () => (
                <Text style={{ fontSize: 18, fontWeight: '600' }}>Your Profile</Text>
            ),
            headerRight: () => (
                <View style={{ paddingRight: 12, flexDirection: 'row', gap: 18, alignItems: 'center' }}>
                    {getProfileEdit.id && <Pressable
                        onPress={() =>
                            navigation.push(namer.navigation.peoplesOnePerson, {
                                getOnePersonId: getProfileEdit.id,
                                alreadyLiked: true,
                                previewProfile: true,
                            })
                        }
                    >
                        <Text style={{ fontSize: 14, color: '#555' }}>Preview</Text>
                    </Pressable>}
                    <Pressable
                        style={[pgStyles.saveBtn]}
                        onPress={handleSaveProfile}
                    >
                        <Text style={pgStyles.saveBtnText}>Save</Text>
                    </Pressable>
                </View>
            ),
        });
    });

    // ── Helpers ────────────────────────────────────────────────────────────
    const getImageUri = useCallback((index: number): string => {
        const target = getProfileEdit?.images?.[index];
        if (!target) return '';
        const path = target?.p ?? target?.uri ?? '';
        const isLocal = target?.local || path.startsWith('file:') || path.startsWith('content:');

        return isLocal ? path : String(imageDomain + path);
    }, [getProfileEdit?.images, __MAPPER]);

    // ── Save ───────────────────────────────────────────────────────────────
    const handleSaveProfile = async () => {
        Loaderx.show();
        try {
            const orderedImageMeta = padImages(getProfileEdit?.images)
                .map((img, index) => {
                    const path = img?.p ?? img?.uri ?? '';
                    if (!path) return null;
                    return {
                        p: path,
                        w: img?.w ?? null,
                        h: img?.h ?? null,
                        o: index,
                    };
                })
                .filter(Boolean);

            const response = await _http_request({
                reqType: 'POST',
                customApiUrl: hostServer() + '/api/core/v1/pushProfile',
                bodyArray: {
                    prof_about: getProfileEdit?.about,
                    prof_smoking: getProfileEdit?.smoking,
                    prof_drinking: getProfileEdit?.drinking,
                    prof_children: getProfileEdit?.children,
                    prof_ethnicity: getProfileEdit?.ethnicity,
                    //prof_pet: getProfileEdit?.pets,
                    prof_religion: getProfileEdit?.religion,
                    prof_bodytype: getProfileEdit?.bodytype,
                    prof_highesteducation: getProfileEdit?.highEducation,
                    prof_relationshipgoal: getProfileEdit?.relationshipgoal,
                    prof_languages: JSON.stringify(getProfileEdit?.languages ?? []),
                    prof_gender: getProfileEdit?.gender,
                    prof_hometown: getProfileEdit?.hometown,
                    prof_schoolattended: getProfileEdit?.schoolattended,
                    prof_political: getProfileEdit?.politicalview,
                    prof_prompts: JSON.stringify(getPrompts ?? []),
                    prof_interests: JSON.stringify(getInterests ?? []),
                    prof_images_meta: JSON.stringify(orderedImageMeta),
                },
            });
            if (response?.code === 200) {
                Toastx.show({ type: 'success', message: response?.userpreferences?.message ?? 'Profile updated!' });
                await cacheStorage.getCurrentUserProfile(true);
                await sleep(2000);
                Loaderx.hide();
                navigation.goBack();
            } else {
                Toastx.show({ type: 'error', message: response?.userpreferences?.message ?? 'Error updating profile!' });
            }
        } catch (error: any) {
            Toastx.show({ type: 'error', message: error?.message ?? 'Unable to save profile.' });
        } finally {
            Loaderx.hide();
        }
    };

    // ── Photo actions ──────────────────────────────────────────────────────
    const handlePress = useCallback(async (index: number) => {
        const media = await mediaHandler.handleSelectFromGallery({
            mediaType: 'photo',
            selectionLimit: 1,
        });
        if (!media || media.length === 0) return;
        const asset = media[0];
        const localPath = asset?.uri ?? '';
        if (!localPath) return;

        Loaderx.show();
        try {
            const ext = getFileExtension(localPath);
            const presigned = await uploadHandler.requestPresignedURL_Upload(ext, 'profile-media');
            const uploadFilePath = localPath.startsWith('file://') ? localPath.replace('file://', '') : localPath;
            const contentType = getMimeTypeFromExt(ext);

            const uploadResult = await RNFS.uploadFiles({
                toUrl: presigned.uploadUrl,
                files: [
                    {
                        name: 'file',
                        filename: `profile_${Date.now()}_${index}.${ext}`,
                        filepath: uploadFilePath,
                        filetype: contentType,
                    },
                ],
                method: presigned.method || 'PUT',
                headers: {
                    'Content-Type': contentType,
                },
                binaryStreamOnly: true,
            }).promise;

            if (uploadResult.statusCode < 200 || uploadResult.statusCode >= 300) {
                throw new Error('Profile image upload failed.');
            }

            const uploadedPath = encodeFilePath(presigned.fullPath);
            updateProfileEdit(prev => {
                const updated = [...prev.images];
                while (updated.length <= index) updated.push({});
                updated[index] = {
                    ...(updated[index] ?? {}),
                    p: uploadedPath,
                    uri: uploadedPath,
                    local: false,
                    w: asset.width,
                    h: asset.height,
                };
                return {
                    images: updated.slice(0, MAX_PHOTOS),
                };
            });
        } catch (error: any) {
            Toastx.show({ type: 'error', message: error?.message ?? 'Unable to upload profile image.' });
        } finally {
            Loaderx.hide();
        }
    }, [updateProfileEdit]);

    const handleRemoveImage = useCallback((index: number) => {
        updateProfileEdit(prev => {
            const updated = [...prev.images];
            updated[index] = {};
            return { images: updated };
        });
    }, [updateProfileEdit]);

    // ── Drag callbacks ─────────────────────────────────────────────────────
    const handleDragStart = useCallback((_index: number) => {
        // placeholder — extend if you need global drag state
    }, []);

    const handleDragMove = useCallback((fromIndex: number, tx: number, ty: number) => {
        if (containerWidth === 0) return;
        const cells = getCellDims(containerWidth);
        const from = cells[fromIndex];
        const cx = from.x + from.w / 2 + tx;
        const cy = from.y + from.h / 2 + ty;
        const hit = hitTestCell(cells, cx, cy);
        setDropTargetIndex(hit !== -1 && hit !== fromIndex ? hit : null);
    }, [containerWidth]);

    const handleDragEnd = useCallback((fromIndex: number, tx: number, ty: number) => {
        setDropTargetIndex(null);
        if (containerWidth === 0) return;
        const cells = getCellDims(containerWidth);
        const from = cells[fromIndex];
        const cx = from.x + from.w / 2 + tx;
        const cy = from.y + from.h / 2 + ty;
        const toIndex = hitTestCell(cells, cx, cy);
        if (toIndex !== -1 && toIndex !== fromIndex) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            updateProfileEdit(prev => {
                const updated = [...prev.images];
                [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
                return { images: updated };
            });
        }
    }, [containerWidth, updateProfileEdit]);

    const handleGridLayout = useCallback((w: number) => {
        setContainerWidth(w);
    }, []);

    // ── Prompt helpers ─────────────────────────────────────────────────────
    const removePrompt = useCallback((index: number) => {
        setPrompts(prev => prev.filter((_, i) => i !== index));
    }, []);

    // ── Interest helpers ───────────────────────────────────────────────────
    const toggleInterest = useCallback((item: string) => {
        setInterests(prev => {
            if (prev.includes(item)) return prev.filter(v => v !== item);
            if (prev.length >= MAX_INTERESTS) {
                Toastx.show({ message: `Max ${MAX_INTERESTS} interests allowed.`, type: 'info' });
                return prev;
            }
            return [...prev, item];
        });
    }, []);

    const removeInterest = useCallback((item: string) => {
        setInterests(prev => prev.filter(v => v !== item));
    }, []);

    // ── Radio builder ──────────────────────────────────────────────────────
    const buildRadios = (map: Record<string, string> | undefined) =>
        Object.entries(map ?? {}).map(([key, value]) => ({
            id: key,
            label: value as string,
            value: value as string,
        }));

    // ─────────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['bottom']}>
            <View style={[styles.container, { paddingTop: headerHeight }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={{ gap: 12, marginBottom: 12 }}>

                            {/* ── Photo Grid ───────────────────────────────── */}
                            <View style={{ gap: 8, marginBottom: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, }}>
                                    <MIcons name="image-multiple-outline" size={15} color="#888" />
                                    <Text style={pgStyles.sectionLabel}>
                                        Profile Photos
                                    </Text>
                                    <Text style={pgStyles.sectionHint}>· drag to reorder</Text>
                                </View>

                                <PhotoGrid
                                    images={getProfileEdit.images}
                                    containerWidth={containerWidth}
                                    dropTargetIndex={dropTargetIndex}
                                    getImageUri={getImageUri}
                                    onPress={handlePress}
                                    onRemove={handleRemoveImage}
                                    onDragStart={handleDragStart}
                                    onDragMove={handleDragMove}
                                    onDragEnd={handleDragEnd}
                                    onLayout={handleGridLayout}
                                />
                            </View>

                            {/* ── Vibes Banner ──────────────────────────────── */}
                            <LinearGradient
                                colors={['#f95f62', '#f27a9c']}
                                style={[styles.card, { padding: 0 }]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={pgStyles.bannerRow}>
                                    <View style={{ gap: 6, flex: 1 }}>
                                        <View style={pgStyles.bannerBadge}>
                                            <MIcons name="heart-multiple-outline" color="#f95f62" size={14} />
                                            <Text style={pgStyles.bannerBadgeText}>Vibes &amp; Energy</Text>
                                        </View>
                                        <Text style={pgStyles.bannerTitle}>Show your best self today</Text>
                                        <Text style={pgStyles.bannerSubtitle}>
                                            Update a prompt and write a bio to make it easy for others to start a conversation with you.
                                        </Text>
                                    </View>
                                    <MIcons name="flower-tulip-outline" size={78} color="rgba(255,255,255,0.75)" />
                                </View>
                            </LinearGradient>

                            {/* ── Full Name (locked) ───────────────────────── */}
                            <View style={styles.editprofile_inputborder}>
                                <View style={pgStyles.inputHeader}>
                                    <Text style={styles.editprofile_inputtitle}>Full Name</Text>
                                    <IIcon name="lock-closed" size={15} color="#bbb" />
                                </View>
                                <TextInput
                                    style={[styles.editprofile_input, pgStyles.readOnlyInput]}
                                    value={getProfileEdit.fullname}
                                    readOnly
                                />
                            </View>

                            {/* ── Age (locked) ─────────────────────────────── */}
                            <View style={styles.editprofile_inputborder}>
                                <View style={pgStyles.inputHeader}>
                                    <Text style={styles.editprofile_inputtitle}>Age</Text>
                                    <IIcon name="lock-closed" size={15} color="#bbb" />
                                </View>
                                <TextInput
                                    style={[styles.editprofile_input, pgStyles.readOnlyInput]}
                                    value={help.getageFromDOB((getProfileEdit?.age)?.toString() ?? "") ?? '—'}
                                    readOnly
                                />
                            </View>

                            {/* ── About ────────────────────────────────────── */}
                            <View style={styles.editprofile_inputborder}>
                                <View style={pgStyles.inputHeader}>
                                    <Text style={styles.editprofile_inputtitle}>About you</Text>
                                    <IIcon name="create-outline" size={17} color="#888" />
                                </View>
                                <TextInput
                                    style={[styles.editprofile_input, { height: 180 }]}
                                    multiline
                                    numberOfLines={8}
                                    value={getProfileEdit.about}
                                    onChangeText={(e) => updateProfileEdit({ about: e })}
                                    placeholder="Write something about yourself…"
                                    placeholderTextColor="#bbb"
                                    maxLength={400}
                                />
                                <Text style={pgStyles.charCounter}>
                                    {getProfileEdit.about?.length ?? 0}/400 characters
                                </Text>
                            </View>

                            {/* ── Relationship Intention ───────────────────── */}
                            <AccordionItem
                                title="What are your Intentions?"
                                titleStyle={[styles.editprofile_inputtitle, { paddingLeft: 0 }]}
                                subtitle={__MAPPER?.bio_intent?.[getProfileEdit.relationshipgoal ?? ""]}
                                Content={() => (
                                    <RadioGroup
                                        labelStyle={pgStyles.radioLabel}
                                        radioButtons={buildRadios(__MAPPER?.bio_intent)}
                                        containerStyle={{ alignItems: 'flex-start' }}
                                        onPress={(v) => updateProfileEdit({ relationshipgoal: v })}
                                        selectedId={getProfileEdit.relationshipgoal?.toString() ?? ""}
                                    />
                                )}
                            />

                            {/* ── Gender ───────────────────────────────────── */}
                            <AccordionItem
                                title="What is your gender?"
                                titleStyle={[styles.editprofile_inputtitle, { paddingLeft: 0 }]}
                                subtitle={__MAPPER?.bio_gender?.[getProfileEdit.gender ?? ""]}
                                Content={() => (
                                    <RadioGroup
                                        labelStyle={pgStyles.radioLabel}
                                        radioButtons={buildRadios(__MAPPER?.bio_gender)}
                                        containerStyle={{ alignItems: 'flex-start' }}
                                        onPress={(v) => updateProfileEdit({ gender: v })}
                                        selectedId={getProfileEdit.gender?.toString() ?? ""}
                                    />
                                )}
                            />

                            {/* ── Interests ────────────────────────────────── */}
                            <View style={styles.editprofile_inputborder}>
                                <Pressable
                                    style={{ gap: 8 }}
                                    onPress={() => addInterests_ref.current?.snapToIndex(0)}
                                >
                                    <View style={pgStyles.inputHeader}>
                                        <Text style={styles.editprofile_inputtitle}>
                                            Interests
                                            <Text style={pgStyles.countBadge}> {getInterests.length}/{MAX_INTERESTS}</Text>
                                        </Text>
                                        <MIcons name="cursor-default-click-outline" size={17} color="#888" />
                                    </View>

                                    {getInterests.length === 0 ? (
                                        <Text style={pgStyles.placeholder}>Tap to select your interests</Text>
                                    ) : (
                                        <View style={pgStyles.chipRow}>
                                            {getInterests.map((interest, i) => (
                                                <View key={i} style={pgStyles.chip}>
                                                    <Text style={pgStyles.chipText}>{interest}</Text>
                                                    <Pressable
                                                        hitSlop={6}
                                                        onPress={() => removeInterest(interest)}
                                                        style={pgStyles.chipRemove}
                                                    >
                                                        <Text style={pgStyles.chipRemoveText}>×</Text>
                                                    </Pressable>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </Pressable>
                            </View>

                            {/* ── Location (display only) ──────────────────── */}
                            <View style={styles.editprofile_inputborder}>
                                <View style={pgStyles.inputHeader}>
                                    <Text style={styles.editprofile_inputtitle}>Location</Text>
                                    <IIcon name="location-outline" size={17} color="#888" />
                                </View>
                                <Text style={[styles.editprofile_input, pgStyles.readOnlyInput]}>
                                    {getProfileEdit.city || '—'}
                                </Text>
                            </View>

                            {/* ── Hometown ─────────────────────────────────── */}
                            <View style={styles.editprofile_inputborder}>
                                <View style={pgStyles.inputHeader}>
                                    <Text style={styles.editprofile_inputtitle}>Hometown</Text>
                                    <IIcon name="create-outline" size={16} color="#888" />
                                </View>
                                <TextInput
                                    style={styles.editprofile_input}
                                    value={getProfileEdit.hometown}
                                    onChangeText={(text) => updateProfileEdit({ hometown: text })}
                                    placeholder="Where are you from?"
                                    placeholderTextColor="#bbb"
                                    maxLength={45}
                                />
                            </View>

                            {/* ── Highest Education ────────────────────────── */}
                            <AccordionItem
                                title="Highest Education Achieved?"
                                titleStyle={[styles.editprofile_inputtitle, { paddingLeft: 0 }]}
                                subtitle={__MAPPER?.bio_education?.[getProfileEdit.highEducation ?? '']}
                                Content={() => (
                                    <RadioGroup
                                        labelStyle={pgStyles.radioLabel}
                                        radioButtons={buildRadios(__MAPPER?.bio_education)}
                                        containerStyle={{ alignItems: 'flex-start' }}
                                        onPress={(id) => updateProfileEdit({ highEducation: id })}
                                        selectedId={getProfileEdit.highEducation?.toString() ?? ""}
                                    />
                                )}
                            />

                            {/* Languages */}
                            <View style={styles.editprofile_inputborder}>
                                <View style={pgStyles.inputHeader}>
                                    <Text style={styles.editprofile_inputtitle}>Languages</Text>
                                    <IIcon name="language-outline" size={17} color="#888" />
                                </View>
                                <TextInput
                                    style={styles.editprofile_input}
                                    value={getProfileEdit.languages.join(', ')}
                                    onChangeText={(text) => updateProfileEdit({
                                        languages: text
                                            .split(',')
                                            .map((item) => item.trim())
                                            .filter(Boolean)
                                    })}
                                    placeholder="Languages you speak (comma separated)"
                                    placeholderTextColor="#bbb"
                                />
                            </View>

                            {/* School Attended */}
                            <View style={styles.editprofile_inputborder}>
                                <View style={pgStyles.inputHeader}>
                                    <Text style={styles.editprofile_inputtitle}>School Attended</Text>
                                    <IIcon name="create-outline" size={16} color="#888" />
                                </View>
                                <TextInput
                                    style={styles.editprofile_input}
                                    value={getProfileEdit.schoolattended}
                                    onChangeText={(text) => updateProfileEdit({ schoolattended: text })}
                                    placeholder="What school did you attend?"
                                    placeholderTextColor="#bbb"
                                    maxLength={45}
                                />
                            </View>

                            {/* ── Prompts ──────────────────────────────────── */}
                            <View style={[styles.editprofile_inputborder, { padding: 10, gap: 8 }]}>
                                <Text style={styles.editprofile_inputtitle}>
                                    Prompts
                                    <Text style={pgStyles.countBadge}> {getPrompts.length}/{MAX_PROMPTS}</Text>
                                </Text>

                                {getPrompts.map((item, index) => (
                                    <View key={index} style={pgStyles.promptCard}>
                                        <Pressable
                                            style={pgStyles.promptRemove}
                                            onPress={() => removePrompt(index)}
                                            hitSlop={6}
                                        >
                                            <IIcon name="close-circle" size={20} color="#ff4444" />
                                        </Pressable>
                                        <Text style={pgStyles.promptQuestion}>{item?.q}</Text>
                                        <TextInput
                                            style={[styles.editprofile_input, pgStyles.promptAnswer]}
                                            value={item?.a}
                                            placeholder={item?.q}
                                            placeholderTextColor="#bbb"
                                            multiline
                                            maxLength={140}
                                            onChangeText={text => {
                                                setPrompts(prev => {
                                                    const updated = [...prev];
                                                    updated[index] = { ...updated[index], a: text };
                                                    return updated;
                                                });
                                            }}
                                        />
                                    </View>
                                ))}

                                {getPrompts.length < MAX_PROMPTS && (
                                    <Pressable
                                        style={pgStyles.addPromptBtn}
                                        onPress={() => addNewPrompt_ref.current?.snapToIndex(0)}
                                    >
                                        <MIcons name="plus-circle-outline" size={18} color="#f95f62" />
                                        <Text style={pgStyles.addPromptText}>Add a Prompt</Text>
                                    </Pressable>
                                )}
                            </View>

                            {/* ── Life Style Accordions ─────────────────────── */}
                            {[
                                { title: 'Do you have children?', map: __MAPPER?.bio_children, state: getProfileEdit.children, set: (id: string) => updateProfileEdit({ children: id }) },
                                { title: 'Do you smoke?', map: __MAPPER?.bio_smoking, state: getProfileEdit.smoking, set: (id: string) => updateProfileEdit({ smoking: id }) },
                                { title: 'Do you drink?', map: __MAPPER?.bio_drinking, state: getProfileEdit.drinking, set: (id: string) => updateProfileEdit({ drinking: id }) },
                                { title: 'Do you have a pet?', map: __MAPPER?.bio_pets, state: getProfileEdit.pets, set: (id: string) => updateProfileEdit({ pets: id }) },
                                { title: 'What is your religion?', map: __MAPPER?.bio_religion, state: getProfileEdit.religion, set: (id: string) => updateProfileEdit({ religion: id }) },
                                { title: 'What is your ethnicity?', map: __MAPPER?.bio_ethnicity, state: getProfileEdit.ethnicity, set: (id: string) => updateProfileEdit({ ethnicity: id }) },
                                { title: 'Describe your body type', map: __MAPPER?.bio_bodytype, state: getProfileEdit.bodytype, set: (id: string) => updateProfileEdit({ bodytype: id }) },
                                { title: 'Political Views?', map: __MAPPER?.bio_politicalview, state: getProfileEdit.politicalview, set: (id: string) => updateProfileEdit({ politicalview: id }) },
                            ].map(({ title, map, state, set }) => (
                                <AccordionItem
                                    key={title}
                                    title={title}
                                    titleStyle={[styles.editprofile_inputtitle, { paddingLeft: 0 }]}
                                    subtitle={(map as Record<string, string>)?.[state ?? '']}
                                    Content={() => (
                                        <RadioGroup
                                            labelStyle={pgStyles.radioLabel}
                                            radioButtons={buildRadios(map as Record<string, string>)}
                                            containerStyle={{ alignItems: 'flex-start' }}
                                            onPress={set}
                                            selectedId={state?.toString() ?? undefined}
                                        />
                                    )}
                                />
                            ))}

                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            {/* ── Add New Prompt Bottom Sheet ───────────────────────────────── */}
            <BottomSheet
                ref={addNewPrompt_ref}
                index={-1}
                enablePanDownToClose
                snapPoints={addNewPromptSnapPoints}
                backdropComponent={bottomsheet_renderBackdrop}
            >
                <BottomSheetView style={{ flex: 1, padding: 20 }}>
                    <Text style={pgStyles.sheetTitle}>Add a Prompt</Text>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16, gap: 10 }}>
                        {Object.values(__MAPPER?.bio_prompt ?? {})
                            .filter(prompt => !getPrompts.map(p => p.q).includes(prompt as string))
                            .map((prompt: any, index: number) => (
                                <AccordionItem
                                    key={index}
                                    title={prompt}
                                    titleStyle={[styles.editprofile_inputtitle, { paddingLeft: 0 }]}
                                    subtitle=""
                                    Content={() => {
                                        const [text, setText] = useState('');
                                        return (
                                            <View style={{ gap: 8, paddingTop: 4 }}>
                                                <TextInput
                                                    style={[styles.editprofile_input, pgStyles.promptSheetInput]}
                                                    value={text}
                                                    onChangeText={setText}
                                                    placeholder={prompt}
                                                    placeholderTextColor="#bbb"
                                                    maxLength={140}
                                                    multiline
                                                />
                                                <Pressable
                                                    style={pgStyles.sheetSaveBtn}
                                                    onPress={() => {
                                                        if (!getPrompts.map(p => p.q).includes(prompt)) {
                                                            const now = new Date();
                                                            const d =
                                                                `${now.getFullYear()}` +
                                                                `${String(now.getMonth() + 1).padStart(2, '0')}` +
                                                                `${String(now.getDate()).padStart(2, '0')}` +
                                                                `${String(now.getHours()).padStart(2, '0')}` +
                                                                `${String(now.getMinutes()).padStart(2, '0')}` +
                                                                `${String(now.getSeconds()).padStart(2, '0')}`;
                                                            setPrompts(prev => [...prev, { q: prompt, a: text.trim(), d }]);
                                                        }
                                                        addNewPrompt_ref.current?.close();
                                                    }}
                                                >
                                                    <Text style={pgStyles.sheetSaveBtnText}>Save Prompt</Text>
                                                </Pressable>
                                            </View>
                                        );
                                    }}
                                />
                            ))}
                    </ScrollView>
                </BottomSheetView>
            </BottomSheet>

            {/* ── Interests Bottom Sheet ────────────────────────────────────── */}
            <BottomSheet
                ref={addInterests_ref}
                index={-1}
                enablePanDownToClose
                snapPoints={addInterestsSnapPoints}
                backdropComponent={bottomsheet_renderBackdrop}
            >
                <BottomSheetView style={{ flex: 1, padding: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={pgStyles.sheetTitle}>Your Interests</Text>
                        <Text style={pgStyles.countBadge}>{getInterests.length}/{MAX_INTERESTS} selected</Text>
                    </View>
                    <ScrollView
                        contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {Object.entries((__MAPPER?.bio_interests as Record<string, string[]>) ?? {}).map(([category, items]) => (
                            <View key={category} style={pgStyles.interestCategory}>
                                <AccordionItem
                                    title={category}
                                    titleStyle={[styles.editprofile_inputtitle, { paddingLeft: 0 }]}
                                    subtitle=""
                                    Content={() => (
                                        <View style={pgStyles.chipRow}>
                                            {items.map((item: string, idx: number) => {
                                                const selected = getInterests.includes(item);
                                                return (
                                                    <TouchableOpacity
                                                        key={idx}
                                                        style={[pgStyles.chip, selected && pgStyles.chipSelected]}
                                                        onPress={() => toggleInterest(item)}
                                                        activeOpacity={0.75}
                                                    >
                                                        <Text style={[pgStyles.chipText, selected && pgStyles.chipTextSelected]}>
                                                            {item}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}
                                />
                            </View>
                        ))}
                    </ScrollView>
                </BottomSheetView>
            </BottomSheet>
        </SafeAreaView>
    );
}

// ─── Page-level styles ────────────────────────────────────────────────────────
const pgStyles = StyleSheet.create({
    saveBtn: {
        backgroundColor: '#f95f62',
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },

    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#444',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    sectionHint: {
        fontSize: 12,
        color: '#aaa',
    },

    bannerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
    },
    bannerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start',
        gap: 5,
    },
    bannerBadgeText: { color: '#f95f62', fontWeight: '700', fontSize: 12 },
    bannerTitle: { fontSize: 19, color: '#fff', fontWeight: '700', marginTop: 2 },
    bannerSubtitle: { color: '#ffe7ef', fontSize: 12, lineHeight: 17, marginTop: 2 },

    inputHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    readOnlyInput: { color: '#999' },
    charCounter: { fontSize: 11, color: '#bbb', marginTop: 4, textAlign: 'right' },
    placeholder: { color: '#bbb', fontSize: 13, paddingHorizontal: 4, paddingVertical: 6 },

    countBadge: { color: '#aaa', fontSize: 12, fontWeight: '400' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f2f2f2',
        borderRadius: 20,
        paddingHorizontal: 11,
        paddingVertical: 5,
        gap: 5,
    },
    chipSelected: { backgroundColor: '#f95f62' },
    chipText: { fontSize: 13, color: '#333' },
    chipTextSelected: { color: '#fff', fontWeight: '600' },
    chipRemove: { marginLeft: 2 },
    chipRemoveText: { fontSize: 16, color: '#999', lineHeight: 16 },

    promptCard: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee',
        padding: 10,
        gap: 6,
        position: 'relative',
        backgroundColor: '#fafafa',
    },
    promptRemove: { position: 'absolute', top: 8, right: 8, zIndex: 10 },
    promptQuestion: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: '#555', paddingRight: 24 },
    promptAnswer: { minHeight: 60, borderWidth: 0, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 8 },

    addPromptBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#f9a0a2',
    },
    addPromptText: { fontSize: 14, fontWeight: '600', color: '#f95f62' },

    radioLabel: { fontSize: 14, textTransform: 'capitalize' },

    sheetTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
    promptSheetInput: {
        minHeight: 80,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#fafafa',
    },
    sheetSaveBtn: {
        alignSelf: 'flex-end',
        backgroundColor: '#f95f62',
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
    },
    sheetSaveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

    interestCategory: {
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#fafafa',
    },
});
