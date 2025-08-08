export default function SaveAnswerButton({ dirty, taskId, canEdit, orgId, saving, t, handleSave, lang }) {
  if (!dirty[taskId] || !canEdit) return null;
  return (
    <div className="label mt-2 mb-2">
      <button
        className="btn btn-sm btn-primary"
        onClick={() => handleSave(taskId)}
        disabled={saving[taskId] || !orgId}
      >
        {saving[taskId]
          ? t?.common?.loading
          : t?.common?.save
        }
      </button>
    </div>
  );
}