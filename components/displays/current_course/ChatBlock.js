import { getAvatarClass } from './utils';
import SimpleEditor from '@/components/editor/SimpleEditor';
import { MegaphoneIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ChatBlock({
  ansObj,
  chatEditor,
  setChatEditor,
  chatInput,
  setChatInput,
  handleSendChat,
  saving,
  taskId,
  lang,
  user,
  t,
  isSup
}) {

  // Собрать чатовые блоки, с _side = left/right
  function getChatBlocks(ansObj) {
    if (!ansObj) return [];
    const left = (ansObj.review_comments || []).map(msg => ({ ...msg, _side: 'left' }));
    const right = (ansObj.student_questions || []).map(msg => ({ ...msg, _side: 'right' }));
    return [...left, ...right].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  const chatBlocks = getChatBlocks(ansObj);

  return (
    <div className={chatBlocks.length > 0 ? "mt-4 ring-2 ring-secondary/10 p-4 rounded-lg" : "mt-4"}>
      {chatBlocks.length > 0 && (
        <div className="pr-8">
          {chatBlocks.map((msg, idx) => (
            <div
              key={idx}
              className={`chat ${msg._side === 'right' ? 'chat-end' : 'chat-start'}`}
            >
              <div className="chat-image avatar avatar-placeholder">
                <div className={`w-10 rounded-full font-bold ring ${getAvatarClass(msg.role)}`}>
                  {msg.full_name ? msg.full_name.split(" ").map(w => w[0]).join("").toUpperCase() : "U"}
                </div>
              </div>
              <div className="chat-header">
                {msg.full_name || (msg.role === 'public' ? 'Студент' : msg.role)}
                <time className="text-[9px] opacity-50 ml-2">
                  {msg.created_at
                    ? new Date(msg.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : ''}
                </time>
              </div>
              <div
                className={`chat-bubble shadow-lg ${msg._side === 'right'
                  ? ''
                  : msg.role === 'admin'
                    ? 'chat-bubble-error'
                    : msg.role === 'supervisor'
                      ? 'chat-bubble-info'
                      : 'chat-bubble-base-200'
                }`}
                // Рендерим HTML в сообщениях
                dangerouslySetInnerHTML={{ __html: msg.text }}
              />
            </div>
          ))}
        </div>
      )}
      {!chatEditor[taskId] && (
        <div className="flex justify-end">
          <button
            className="btn btn-sm btn-ghost mt-2"
            onClick={() => setChatEditor((prev) => ({ ...prev, [taskId]: true }))}
          >
            {/* {isSup ? t.courses.answer_review : t.common.ask_question} */}
            <MegaphoneIcon className="w-5" />
            {t.common.communication}
          </button>
        </div>
      )}
      {chatEditor[taskId] && (
        <div className="mt-2">
          <SimpleEditor
            value={chatInput[taskId] || ""}
            onChange={e =>
              setChatInput((prev) => ({
                ...prev,
                [taskId]: e.target.value,
              }))
            }
            placeholder={t.common.enter_message}
            disabled={saving[taskId]}
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-sm btn-primary"
              onClick={() =>
                handleSendChat(taskId, chatInput[taskId] || "")
              }
              disabled={saving[taskId] || !chatInput[taskId]}
            >
              <PaperAirplaneIcon className="w-4" />
              {t.common.send}
            </button>
            <button
              className="btn btn-sm"
              onClick={() =>
                setChatEditor((prev) => ({
                  ...prev,
                  [taskId]: false,
                }))
              }
              disabled={saving[taskId]}
            >
              <XMarkIcon className="w-4" />
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}