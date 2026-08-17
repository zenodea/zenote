"use client";

import { folder as folderOf } from "@/lib/slug";
import { Modal } from "@/components/ui/Modal";
import { resultRowClass } from "@/components/ui/ResultRow";
import { Scroller } from "@/components/ui/Scroller";

export type Moving = { kind: "note" | "folder"; path: string };

export function MoveModal({
  moving,
  folders,
  onMove,
  onClose,
}: {
  moving: Moving;
  folders: string[];
  onMove: (moving: Moving, into: string) => void;
  onClose: () => void;
}) {
  const from = folderOf(moving.path);

  const destinations = ["", ...folders].filter((into) => {
    if (into === from) return false;
    if (moving.kind !== "folder") return true;
    return into !== moving.path && !into.startsWith(`${moving.path}/`);
  });

  const name = moving.path.split("/").pop();

  return (
    <Modal title={`Move “${name}” to…`} onClose={onClose}>
      <Scroller className="mt-3 max-h-72">
        <ul>
          {destinations.map((into) => (
            <li key={into || "/"}>
              <button
                type="button"
                onClick={() => {
                  onMove(moving, into);
                  onClose();
                }}
                className={`${resultRowClass(false)} truncate`}
              >
                {into || "Vault root"}
              </button>
            </li>
          ))}
          {destinations.length === 0 && (
            <li className="px-2 py-1.5 opacity-50">Nowhere else to go</li>
          )}
        </ul>
      </Scroller>
    </Modal>
  );
}
