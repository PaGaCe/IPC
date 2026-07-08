import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlayerRow } from "../views/PlayerRow";

export function SortablePlayerRow({ p, teamName, mode, ...rest }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: p.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "#0f2138" : "transparent",
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          {...listeners}
          style={{
            padding: "10px 8px 10px 0",
            cursor: "grab",
            color: "#3a5a7a",
            touchAction: "none",
          }}
        >
          ⠿
        </div>
        <div style={{ flex: 1 }}>
          <PlayerRow p={p} teamName={teamName} mode={mode} {...rest} />
        </div>
      </div>
    </div>
  );
}
