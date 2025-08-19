import { RocketLaunchIcon } from "@heroicons/react/24/outline";

export default function SaveAnswerButton({ dirty, taskId, canEdit, orgId, saving, t, handleSave, lang }) {
  if (!dirty[taskId] || !canEdit) return null;
  return (
    <div className="label mt-2 mb-2">
      <button
        className="btn btn-primary"
        onClick={() => handleSave(taskId)}
        disabled={saving[taskId] || !orgId}
      >
        <RocketLaunchIcon className="w-5" />
        {saving[taskId]
          ? t?.common?.loading
          : t?.common?.save
        }
      </button>
    </div>
  );
}