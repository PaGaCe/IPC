import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortablePlayerRow } from "./SortablePlayerRow";

export function SquadDndList({ teamName, squad, onReorder, ...playerRowProps }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = squad.findIndex((p) => p.id === active.id);
    const newIndex = squad.findIndex((p) => p.id === over.id);
    onReorder(teamName, oldIndex, newIndex, squad);
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={squad.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        {squad.map((p) => (
          <SortablePlayerRow
            key={p.id}
            p={p}
            teamName={teamName}
            mode="own"
            {...playerRowProps}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
