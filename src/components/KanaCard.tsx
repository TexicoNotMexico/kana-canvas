import { Group, Rect, Text } from "react-konva";
import { SIZE, SNAP_THRESHOLD } from "../constants";

type Point = { x: number; y: number };

type Props = {
    x: number;
    y: number;
    char: string;
    onPositionChange: (position: Point) => void;
};

export const KanaCard = ({ x: initialX, y: initialY, char, onPositionChange }: Props) => {
    const isSnapped = initialX % SIZE === 0 && initialY % SIZE === 0;

    return (
        <Group
            x={initialX}
            y={initialY}
            draggable
            onDragStart={(e) => {
                e.target.moveToTop();
                e.target.getLayer()?.batchDraw();
            }}
            onDragMove={(e) => {
                const node = e.target;
                let x = node.x();
                let y = node.y();

                const gx = Math.round(x / SIZE) * SIZE;
                const gy = Math.round(y / SIZE) * SIZE;

                if (Math.abs(x - gx) < SNAP_THRESHOLD && Math.abs(y - gy) < SNAP_THRESHOLD) {
                    x = gx;
                    y = gy;
                    node.x(gx);
                    node.y(gy);
                }

                onPositionChange({ x, y });
            }}
        >
            <Rect
                width={SIZE}
                height={SIZE}
                fill="oklch(26.9% 0 0 / .5)"
                stroke={isSnapped ? "oklch(40.8% 0.123 38.172)" : "#fff"}
                strokeWidth={isSnapped ? 2 : 1}
                dash={isSnapped ? [] : [4, 2]}
            />
            <Text
                text={char}
                width={SIZE}
                height={SIZE}
                fontSize={35}
                align="center"
                verticalAlign="middle"
                fill="#fff"
            />
        </Group>
    );
};
