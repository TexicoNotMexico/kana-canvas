import { Layer, Circle } from "react-konva";
import { useMemo } from "react";
import { SIZE } from "@/constants";

type GridProps = {
    stagePos: { x: number; y: number };
    stageScale: { x: number; y: number };
};

const getGridSizeAndRadius = (scale: number) => {
    if (scale < 0.35) return { size: SIZE * 4, radius: 5 };
    if (scale < 0.6) return { size: SIZE * 2, radius: 2.5 };
    return { size: SIZE, radius: 1 };
};

export const GridLayer = ({ stagePos, stageScale }: GridProps) => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const dots = useMemo(() => {
        const scale = stageScale.x;
        const { size: GRID_SIZE, radius: POINT_RADIUS } = getGridSizeAndRadius(scale);

        const paddingFactor = 2 / scale;

        const startX = Math.floor((-stagePos.x / scale - width * paddingFactor) / GRID_SIZE) * GRID_SIZE;
        const endX = Math.floor((-stagePos.x / scale + width * paddingFactor) / GRID_SIZE) * GRID_SIZE;

        const startY = Math.floor((-stagePos.y / scale - height * paddingFactor) / GRID_SIZE) * GRID_SIZE;
        const endY = Math.floor((-stagePos.y / scale + height * paddingFactor) / GRID_SIZE) * GRID_SIZE;

        const coords: { x: number; y: number }[] = [];
        for (let x = startX; x < endX; x += GRID_SIZE) {
            for (let y = startY; y < endY; y += GRID_SIZE) {
                coords.push({ x, y });
            }
        }

        return coords.map(({ x, y }) => (
            <Circle key={`${x}-${y}`} x={x} y={y} radius={POINT_RADIUS} fill="#fff" listening={false} />
        ));
    }, [height, stagePos.x, stagePos.y, stageScale.x, width]);

    return (
        <Layer listening={false} opacity={0.4}>
            {dots}
        </Layer>
    );
};
