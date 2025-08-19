'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import simplify from 'simplify-js'
import SimpleEditor from '@/components/editor/SimpleEditor'
import ChatBlock from './ChatBlock'
import SaveAnswerButton from './SaveAnswerButton'
import { BookOpenIcon } from '@heroicons/react/24/outline'

const PicEditor = dynamic(() => import('./PicEditor'), { ssr: false })

function getStatusColorClass(status) {
  switch (status) {
    case 'done': return 'bg-success text-success-content'
    case 'corrected': return 'bg-info text-info-content'
    case 'rejected': return 'bg-error text-error-content'
    case 'accepted': return 'bg-warning text-warning-content'
    default: return 'bg-neutral text-neutral-content'
  }
}

export default function LessonTaskCard({
  task,
  ansObj,
  lang,
  canEdit,
  isLocked,
  dirty,
  saving,
  orgId,
  t,
  handleChange,
  handleSave,
  chatEditor,
  setChatEditor,
  chatInput,
  setChatInput,
  handleSendChat,
  user,
  handleReadMark,
  isSup
}) {
  const status = ansObj?.status || ''
  const isAccepted = status === 'accepted'
  const isRejected = status === 'rejected'
  const [completedActions, setCompletedActions] = useState({ accepted: false, rejected: false })

  const isReviewing = saving?.[task.id]

  let initialPaths = []
  if (task.type === 'pic') {
    try {
      initialPaths = ansObj?.answer ? JSON.parse(ansObj.answer) : []
    } catch (err) {
      console.error('LessonTaskCard: JSON.parse failed for answerJson:', err)
    }
  }

  const renderReviewButtons = () => {
    if (!isSup) return null

    const buttons = []

    if (!isAccepted && !completedActions.accepted) {
      buttons.push(
        <button
          key="accept"
          className="btn btn-sm btn-success"
          disabled={isReviewing}
          onClick={async () => {
            await handleSave(task.id, 'accepted')
            setCompletedActions(prev => ({ ...prev, accepted: true }))
          }}
        >
          {isReviewing && saving?.[task.id]
            ? <><span className="loading loading-spinner"></span> {t.common.loading || 'Загрузка'}</>
            : t.courses?.approve}
        </button>
      )
    }

    if (!isRejected && !completedActions.rejected) {
      buttons.push(
        <button
          key="reject"
          className="btn btn-sm btn-error btn-outline"
          disabled={isReviewing}
          onClick={async () => {
            await handleSave(task.id, 'rejected')
            setCompletedActions(prev => ({ ...prev, rejected: true }))
          }}
        >
          {isReviewing && saving?.[task.id]
            ? <><span className="loading loading-spinner"></span> {t.common.loading || 'Загрузка'}</>
            : t.courses?.reject_lesson}
        </button>
      )
    }

    return <div className="flex gap-2 mt-2">{buttons}</div>
  }

  return (
    <div key={task.id} className="card bg-base-100 max-w-3xl rounded-none">

      <div className={`pl-0 shadow-none indicator w-full pt-4${task.type !== 'read' ? " alert rounded-l-none": ""}`}>
        {task.type !== 'read' && (
          <span className={`indicator-item indicator-center badge shadow badge-soft ${
            status === 'accepted' ? 'badge-warning'
            : status === 'done' ? 'badge-success'
            : status === 'rejected' ? 'badge-error animate-bounce'
            : status === 'corrected' ? 'badge-info'
            : status === '' ? 'animate-pulse'
            : ''
          }`}>{t.courses.lessonStatuses[status] || "---"}</span>
        )}

        {task.type !== 'read' && (
          <div className="avatar avatar-placeholder ml-4">
            <div className={`${getStatusColorClass(status)} w-10 rounded-full`}>
              <span className="text-xm font-bold">{task.num}</span>
            </div>
          </div>
        )}

        <div className={
          task.type === 'read'
            ? `border-l-4 border-success p-6 py-2 text-lg font-medium uppercase flex items-center rounded-r-xl ${
                status === 'done' ? 'bg-success/70 border text-success-content' : 'text-primary border border-dashed'
              }`
            : 'max-w-2xl font-semibold'
        }>
          {task.type === 'read' && <div className="w-16 mr-6"><BookOpenIcon className="w-12" /></div>}
          <span className={task.type === 'read' ? '' : 'text-secondary font-bold'}>{task.question}</span>
        </div>
      </div>

      <div className="max-w-3xl mt-2 ml-4">
        {/* WRITE */}
        {task.type === 'write' && (
          <fieldset className="fieldset max-w-2xl ml-14 mr-2">
            {!isSup && !isAccepted && canEdit ? (
              <>
                <SimpleEditor
                  value={ansObj?.answer || ''}
                  onChange={(e) => handleChange(task.id, e.target.value)}
                  placeholder={t.courses.your_answer}
                  disabled={false}
                />
                <SaveAnswerButton
                  dirty={dirty}
                  taskId={task.id}
                  canEdit={canEdit}
                  orgId={orgId}
                  saving={saving}
                  t={t}
                  handleSave={handleSave}
                  lang={lang}
                />
              </>
            ) : (
              <div className="prose-lg -mt-3 py-2 pr-2 mb-2 min-h-16 border-l-2 pl-4 border-secondary/30 -ml-9" dangerouslySetInnerHTML={{
                __html: ansObj?.answer || `<span class='text-gray-400'>${lang === 'ru' ? 'Нет ответа' : 'No answer yet'}</span>`
              }} />
            )}

            {renderReviewButtons()}

            <ChatBlock
              ansObj={ansObj}
              chatEditor={chatEditor}
              setChatEditor={setChatEditor}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleSendChat={handleSendChat}
              saving={saving}
              taskId={task.id}
              lang={lang}
              user={user}
              t={t}
              isSup={isSup}
            />

            {!orgId && (
              <div className="label mt-2 text-sm text-error">
                {lang === 'ru'
                  ? 'Организация не определена. Обновите страницу или обратитесь к администратору.'
                  : 'Organization is not defined. Please reload the page or contact admin.'}
              </div>
            )}
          </fieldset>
        )}

        {/* READ */}
        {task.type === 'read' && (
          <fieldset className="fieldset max-w-2xl mt-2 ml-14">
            {!isSup && ansObj?.status !== 'done' && canEdit && (
              <button
                className="btn btn-sm btn-primary mb-2 max-w-32"
                onClick={() => handleReadMark(task.id)}
                disabled={saving[task.id] || !orgId}
              >
                {saving[task.id]
                  ? <><span className="loading loading-spinner"></span> {t.common.loading || 'Загрузка'}</>
                  : lang === 'ru' ? t.courses.read : t.courses.mark_as_done}
              </button>
            )}
            {!isSup && (
              <ChatBlock
                ansObj={ansObj}
                chatEditor={chatEditor}
                setChatEditor={setChatEditor}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSendChat={handleSendChat}
                saving={saving}
                taskId={task.id}
                lang={lang}
                user={user}
                t={t}
              />
            )}
          </fieldset>
        )}

        {/* PIC */}
        {task.type === 'pic' && (
          <fieldset className="relative fieldset max-w-2xl ml-14">
            <PicEditor
              initialPaths={initialPaths}
              onChangePaths={(paths) => {
                handleChange(task.id,
                  JSON.stringify(paths.map(path => {
                    if (!Array.isArray(path.paths)) return path
                    const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100
                    const simplified = simplify(path.paths, 2, true)
                    const rounded = simplified.map(p => ({ x: round2(p.x), y: round2(p.y) }))
                    return { ...path, paths: rounded }
                  }))
                )
              }}
              t={t}
            />

            {isSup && renderReviewButtons()}

            {!isSup && canEdit && (
              <SaveAnswerButton
                dirty={dirty}
                taskId={task.id}
                canEdit={canEdit}
                orgId={orgId}
                saving={saving}
                t={t}
                handleSave={handleSave}
                lang={lang}
              />
            )}

            <ChatBlock
              ansObj={ansObj}
              chatEditor={chatEditor}
              setChatEditor={setChatEditor}
              chatInput={chatInput}
              setChatInput={setChatInput}
              handleSendChat={handleSendChat}
              saving={saving}
              taskId={task.id}
              lang={lang}
              user={user}
              t={t}
            />
          </fieldset>
        )}
      </div>
    </div>
  )
}