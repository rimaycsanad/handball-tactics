import { t, playText } from "../i18n";
import { useRef, useState } from "react";
import type { Play, Point, Action } from "../domain/model";
import type { Scene } from "../domain/engine";

type Props = {
  play: Play;
  scene: Scene;
  actions?: Action[];
  selectedActor?: string;
  selectedAction?: string;
  editing?: boolean;
  movable?: boolean;
  showDefense?: boolean;
  showPaths?: boolean;
  mini?: boolean;
  onActor?: (id: string) => void;
  onPoint?: (point: Point) => void;
  onMove?: (id: string, point: Point) => void;
};
export function Court({
  play,
  scene,
  actions = [],
  selectedActor,
  selectedAction,
  editing = false,
  movable = false,
  showDefense = true,
  showPaths = true,
  mini = false,
  onActor,
  onPoint,
  onMove,
}: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{
    id: string;
    point: Point;
    start: Point;
  } | null>(null);
  const height = play.court === "full" ? 40 : 20;
  const point = (clientX: number, clientY: number): Point => {
    const matrix = svg.current!.getScreenCTM();
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix!.inverse());
    return {
      x: Math.round(Math.max(0.3, Math.min(19.7, p.x)) * 10) / 10,
      y: Math.round(Math.max(0.3, Math.min(height - 0.3, p.y)) * 10) / 10,
    };
  };
  const markerId = mini ? `mini-${play.id}` : "court-arrow";
  return (
    <svg
      ref={svg}
      className={`court ${mini ? "court-mini" : ""} ${editing ? "is-editing" : ""}`}
      viewBox={`-.6 -1 21.2 ${height + 2}`}
      role={editing ? "group" : "img"}
      aria-label={t`${play.court === "full" ? t("Egész") : t("Fél")} kézilabdapálya · ${playText(play, play.title)}`}
      onPointerMove={(e) => {
        if (drag) setDrag({ ...drag, point: point(e.clientX, e.clientY) });
      }}
      onPointerUp={(e) => {
        if (drag) {
          const end = point(e.clientX, e.clientY);
          const moved =
            Math.hypot(end.x - drag.start.x, end.y - drag.start.y) > 0.15;
          if (moved) onMove?.(drag.id, end);
          setDrag(null);
          return;
        }
        if (
          editing &&
          e.target === e.currentTarget.querySelector("[data-court-background]")
        )
          onPoint?.(point(e.clientX, e.clientY));
      }}
      onPointerCancel={() => setDrag(null)}
    >
      <defs>
        <pattern
          id={`grain-${markerId}`}
          width="1"
          height="1"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 1L1 0"
            stroke="#fff"
            strokeOpacity=".025"
            strokeWidth=".025"
          />
        </pattern>
        <marker
          id={markerId}
          markerWidth="5"
          markerHeight="5"
          refX="4"
          refY="2.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0 0L5 2.5L0 5" fill="context-stroke" />
        </marker>
      </defs>
      <rect
        x="0"
        y="0"
        width="20"
        height={height}
        rx=".12"
        fill="#d7dfce"
        data-court-background
      />
      <rect
        x="0"
        y="0"
        width="20"
        height={height}
        fill={`url(#grain-${markerId})`}
        pointerEvents="none"
      />
      <g pointerEvents="none" fill="none" stroke="#fafcf6" strokeWidth=".11">
        <path d="M2.5 0A6 6 0 0 0 8.5 6H11.5A6 6 0 0 0 17.5 0" fill="#bccbb2" />
        <path
          d="M-.5 0A9 9 0 0 0 8.5 9H11.5A9 9 0 0 0 20.5 0"
          strokeDasharray=".38 .3"
        />
        <path d="M9.5 7H10.5M9.75 4H10.25" />
        <rect width="20" height={height} />
        <path d="M8.5 0V-.55H11.5V0" stroke="#52634d" strokeWidth=".18" />
        <path d="M0 20H20M10 19.65V20.35" />
        {height === 40 && (
          <>
            <circle cx="10" cy="20" r="2" />
            <g transform="translate(20 40) rotate(180)">
              <path
                d="M2.5 0A6 6 0 0 0 8.5 6H11.5A6 6 0 0 0 17.5 0"
                fill="#bccbb2"
              />
              <path
                d="M-.5 0A9 9 0 0 0 8.5 9H11.5A9 9 0 0 0 20.5 0"
                strokeDasharray=".38 .3"
              />
              <path d="M9.5 7H10.5M8.5 0V-.55H11.5V0" />
            </g>
          </>
        )}
      </g>
      {showPaths && (
        <g pointerEvents="none" fill="none">
          {actions.map((a) => {
            const start = scene.positions[a.actorId];
            if (!start) return null;
            const points = [start, ...a.path];
            const active = a.id === selectedAction;
            const color =
              a.kind === "pass"
                ? "#8a650f"
                : a.kind === "shot"
                  ? "#be5638"
                  : active
                    ? "#103f31"
                    : "#496846";
            return (
              <g key={a.id} opacity={mini ? 0.5 : 0.8}>
                <polyline
                  points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                  stroke={color}
                  strokeWidth={active ? 0.16 : 0.1}
                  strokeDasharray={
                    a.kind === "pass"
                      ? ".25 .22"
                      : a.kind === "dribble"
                        ? ".1 .12"
                        : undefined
                  }
                  markerEnd={
                    a.kind === "screen" ? undefined : `url(#${markerId})`
                  }
                />
                {a.kind === "screen" && (
                  <path
                    d={`M${a.path.at(-1)!.x - 0.45} ${a.path.at(-1)!.y}h.9`}
                    stroke={color}
                    strokeWidth=".2"
                  />
                )}
              </g>
            );
          })}
        </g>
      )}
      {play.actors
        .filter((a) => showDefense || a.team !== "defense")
        .map((actor) => {
          const p =
            drag?.id === actor.id
              ? drag.point
              : (scene.positions[actor.id] ?? actor.position);
          const selected = actor.id === selectedActor;
          return (
            <g
              key={actor.id}
              transform={`translate(${p.x} ${p.y})`}
              className={editing ? "actor interactive" : "actor"}
              role={editing ? "button" : undefined}
              aria-label={
                editing ? t`${t(actor.label)} játékos kiválasztása` : undefined
              }
              tabIndex={editing ? 0 : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onActor?.(actor.id);
                }
                if (
                  editing &&
                  movable &&
                  ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  onMove?.(actor.id, {
                    x: Math.max(
                      0.3,
                      Math.min(
                        19.7,
                        p.x +
                          (e.key === "ArrowRight"
                            ? 0.2
                            : e.key === "ArrowLeft"
                              ? -0.2
                              : 0),
                      ),
                    ),
                    y: Math.max(
                      0.3,
                      Math.min(
                        height - 0.3,
                        p.y +
                          (e.key === "ArrowDown"
                            ? 0.2
                            : e.key === "ArrowUp"
                              ? -0.2
                              : 0),
                      ),
                    ),
                  });
                }
              }}
              onPointerDown={(e) => {
                if (!editing) return;
                e.stopPropagation();
                onActor?.(actor.id);
                if (movable) {
                  svg.current!.setPointerCapture(e.pointerId);
                  setDrag({ id: actor.id, point: p, start: p });
                }
              }}
            >
              {selected && (
                <circle r=".8" fill="none" stroke="#e2b65c" strokeWidth=".1" />
              )}
              <circle
                r=".57"
                fill={
                  actor.team === "attack"
                    ? "#174c3a"
                    : actor.team === "keeper"
                      ? "#d9a342"
                      : "#f8faf5"
                }
                stroke={actor.team === "defense" ? "#87977d" : "#123c2f"}
                strokeWidth=".07"
              />
              <text
                y=".03"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize=".42"
                fontFamily="system-ui,sans-serif"
                fontWeight="700"
                fill={actor.team === "attack" ? "#fff" : "#3a4b33"}
                pointerEvents="none"
              >
                {t(actor.label)}
              </text>
            </g>
          );
        })}
      <g
        pointerEvents="none"
        transform={`translate(${scene.ball.x + 0.52} ${scene.ball.y - 0.4})`}
      >
        <circle r=".23" fill="#e8ad43" stroke="#fff8df" strokeWidth=".07" />
        <path d="M-.14 0H.14M0-.14V.14" stroke="#966221" strokeWidth=".025" />
      </g>
      {!mini && (
        <g
          pointerEvents="none"
          fontSize=".32"
          fill="#76866e"
          fontFamily="system-ui,sans-serif"
        >
          <text x=".5" y="19.5">
            {t("HANDBALL PLAYLAB")}
          </text>
          <text x="19.5" y="19.5" textAnchor="end">
            {height === 40 ? "40 × 20 M" : "20 × 20 M"}
          </text>
        </g>
      )}
    </svg>
  );
}
