import Konva from "konva";
import { Stage, Layer } from "react-konva";
import { useState, useCallback, useRef } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { CHAR_SETS, DEFAULT_CHAR_SET } from "./charsets";
import { MAX_SCALE, MIN_SCALE, SIZE } from "./constants";
import { GridLayer } from "./components/GridLayer";
import { KanaCard } from "./components/KanaCard";
import { Button } from "./components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useTheme } from "@/components/theme-provider";
import { AlertCircleIcon, CirclePlus, House, Moon, Settings, Sun, SunMoon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Label } from "./components/ui/label";

Konva.hitOnDragEnabled = true;

type Point = { x: number; y: number };
type CardData = { x: number; y: number; char: string };
type CardPositions = Record<string, CardData>;

function App() {
    const stageRef = useRef<Konva.Stage>(null);

    const [stagePos, setStagePos] = useState<Point>({
        x: window.innerWidth / 2 - SIZE / 2,
        y: window.innerHeight / 2 - SIZE / 2,
    });
    const [stageScale, setStageScale] = useState<Point>({ x: 1, y: 1 });
    const [lastCenter, setLastCenter] = useState<Point | null>(null);
    const [lastDist, setLastDist] = useState<number>(0);
    const [dragStopped, setDragStopped] = useState<boolean>(false);

    const [selectedCharSetId, setSelectedCharSetId] = useState<string>(DEFAULT_CHAR_SET.id);
    const [appliedCharSetId, setAppliedCharSetId] = useState<string>(DEFAULT_CHAR_SET.id);

    const initializeCardPositions = (matrix: (string | null)[][]) => {
        const positions: CardPositions = {};
        const cols = matrix[0]?.length || 0;
        const rows = matrix.length;
        const centerCol = Math.floor((cols - 1) / 2);
        const centerRow = Math.floor((rows - 1) / 2);

        matrix.forEach((row, rowIndex) => {
            row.forEach((char, colIndex) => {
                if (char) {
                    const key = `${rowIndex}-${colIndex}`;
                    const offsetX = (colIndex - centerCol) * SIZE;
                    const offsetY = (rowIndex - centerRow) * SIZE;
                    positions[key] = { x: offsetX, y: offsetY, char };
                }
            });
        });
        return positions;
    };

    const [cardPositions, setCardPositions] = useState<CardPositions>(() =>
        initializeCardPositions(DEFAULT_CHAR_SET.matrix)
    );

    const handleCharSetChange = (charSetId: string) => {
        setSelectedCharSetId(charSetId);
    };

    const applyCharSet = () => {
        const charSet = CHAR_SETS.find((cs) => cs.id === selectedCharSetId);
        if (charSet) {
            setAppliedCharSetId(selectedCharSetId);
            setCardPositions(initializeCardPositions(charSet.matrix));
        }
    };

    const updateCardPosition = (key: string, position: Point) => {
        setCardPositions((prev) => ({
            ...prev,
            [key]: { ...prev[key], x: position.x, y: position.y },
        }));
    };

    const getDistance = (p1: Point, p2: Point): number => Math.hypot(p2.x - p1.x, p2.y - p1.y);

    const getCenter = (p1: Point, p2: Point): Point => ({
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
    });

    // pc
    const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
        if (!e.evt.ctrlKey) return;

        e.evt.preventDefault();

        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stagePos.x) / oldScale,
            y: (pointer.y - stagePos.y) / oldScale,
        };

        let direction = e.evt.deltaY > 0 ? 1 : -1;
        if (e.evt.ctrlKey) direction = -direction;

        const scaleBy = 1.1;
        let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

        setStageScale({ x: newScale, y: newScale });

        setStagePos({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    };

    // mobile
    const handleTouchMove = useCallback(
        (e: KonvaEventObject<TouchEvent>) => {
            e.evt.preventDefault();
            const touch1 = e.evt.touches[0];
            const touch2 = e.evt.touches[1];
            const stage = e.target.getStage();

            if (!stage) return;

            if (touch1 && !touch2 && !stage.isDragging() && dragStopped) {
                stage.startDrag();
                setDragStopped(false);
            }

            if (touch1 && touch2) {
                if (stage.isDragging()) {
                    stage.stopDrag();
                    setDragStopped(true);
                }

                const rect = stage.container().getBoundingClientRect();
                const p1: Point = { x: touch1.clientX - rect.left, y: touch1.clientY - rect.top };
                const p2: Point = { x: touch2.clientX - rect.left, y: touch2.clientY - rect.top };

                if (!lastCenter) {
                    setLastCenter(getCenter(p1, p2));
                    return;
                }

                const newCenter = getCenter(p1, p2);
                const dist = getDistance(p1, p2);

                if (!lastDist) {
                    setLastDist(dist);
                    return;
                }

                const pointTo: Point = {
                    x: (newCenter.x - stagePos.x) / stageScale.x,
                    y: (newCenter.y - stagePos.y) / stageScale.y,
                };

                let scale = stageScale.x * (dist / lastDist);
                scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
                setStageScale({ x: scale, y: scale });

                const dx = newCenter.x - lastCenter.x;
                const dy = newCenter.y - lastCenter.y;

                setStagePos({
                    x: newCenter.x - pointTo.x * scale + dx,
                    y: newCenter.y - pointTo.y * scale + dy,
                });

                setLastDist(dist);
                setLastCenter(newCenter);
            }
        },
        [dragStopped, lastCenter, lastDist, stagePos, stageScale]
    );

    const handleTouchEnd = () => {
        setLastDist(0);
        setLastCenter(null);
    };

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        setDragStopped(false);
        setStagePos({ x: stage.x(), y: stage.y() });
    };

    const { theme, setTheme } = useTheme();
    const currentCharSet = CHAR_SETS.find((cs) => cs.id === appliedCharSetId) || DEFAULT_CHAR_SET;

    return (
        <Dialog>
            <div className="bg-zinc-950 h-screen w-screen overflow-hidden relative">
                <Stage
                    ref={stageRef}
                    width={window.innerWidth}
                    height={window.innerHeight}
                    className="absolute top-0 left-0 z-0"
                    draggable
                    x={stagePos.x}
                    y={stagePos.y}
                    scaleX={stageScale.x}
                    scaleY={stageScale.y}
                    onWheel={handleWheel}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDragEnd={handleDragEnd}
                >
                    <GridLayer stagePos={stagePos} stageScale={stageScale} />

                    <Layer>
                        {currentCharSet.matrix.map((row, rowIndex) =>
                            row.map((char, colIndex) => {
                                if (!char) return null;
                                const key = `${rowIndex}-${colIndex}`;
                                const cardData = cardPositions[key];
                                return (
                                    <KanaCard
                                        key={key}
                                        x={cardData.x}
                                        y={cardData.y}
                                        char={cardData.char}
                                        onPositionChange={(newPos) => updateCardPosition(key, newPos)}
                                    />
                                );
                            })
                        )}
                    </Layer>
                </Stage>

                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <DialogTrigger asChild>
                        <Button variant="outline">文字セット</Button>
                    </DialogTrigger>
                    <Button variant="outline">
                        <CirclePlus />
                    </Button>
                    <Button variant="outline">
                        <Settings />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setStagePos({
                                x: window.innerWidth / 2 - SIZE / 2,
                                y: window.innerHeight / 2 - SIZE / 2,
                            });
                            setStageScale({ x: 1, y: 1 });
                        }}
                    >
                        <House />
                    </Button>
                    <Button variant="outline" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                        {theme === "dark" ? <Moon /> : theme === "light" ? <Sun /> : <SunMoon />}
                    </Button>
                </div>
            </div>

            <form>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>文字セットを選択</DialogTitle>
                        <DialogDescription>カンバスに追加する文字カードのセットを選択します。</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <Label htmlFor="char-set">文字セット</Label>
                            <Select value={selectedCharSetId} onValueChange={handleCharSetChange}>
                                <SelectTrigger id="char-set" className="w-full">
                                    <SelectValue placeholder="文字セットを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {CHAR_SETS.map((charset) => (
                                            <SelectItem key={charset.id} value={charset.id}>
                                                {charset.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Alert variant="destructive">
                        <AlertCircleIcon />
                        <AlertTitle>注意</AlertTitle>
                        <AlertDescription>
                            <p>
                                「続行する」をクリックするとこれまでの変更は
                                <span className="font-black">すべて破棄</span>されます。この操作は
                                <span className="font-black">不可逆</span>です。
                            </p>
                        </AlertDescription>
                    </Alert>
                    <DialogFooter className="sm:justify-end">
                        <DialogClose asChild>
                            <Button type="button" variant="default" onClick={applyCharSet}>
                                続行する
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </form>
        </Dialog>
    );
}

export default App;
