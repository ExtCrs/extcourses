'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ReactSketchCanvas } from 'react-sketch-canvas'
import { PencilIcon, TrashIcon, ArrowTurnLeftDownIcon, ArrowTurnRightDownIcon } from '@heroicons/react/24/solid'

export default function PicEditor({ initialPaths = [], onChangePaths, t }) {
  const canvasRef = useRef(null)
  const [paths, setPaths] = useState(initialPaths)
  const [strokeColor, setStrokeColor] = useState('blue')
  const [showClearModal, setShowClearModal] = useState(false)

  // Загрузка initialPaths
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas()
      canvasRef.current.loadPaths(initialPaths)
      setPaths(initialPaths)
    }
  }, [initialPaths])

  // Универсальный метод обновления путей
  const updateAfterEdit = () => {
    canvasRef.current?.exportPaths().then((exported) => {
      setPaths(exported)
      onChangePaths?.(exported)
    })
  }

  const handleStroke = (path, isEraser) => {
    if (!path || !Array.isArray(path.paths)) return
    updateAfterEdit()
  }

const undo = () => {
  canvasRef.current?.undo()
  canvasRef.current?.exportPaths().then(all => {
    setPaths(all)
  })
}

  const redo = async () => {
    await canvasRef.current?.redo()
    updateAfterEdit()
  }

  const requestClear = () => {
    setShowClearModal(true)
  }

  const confirmClear = () => {
    canvasRef.current?.clearCanvas()
    setPaths([])
    onChangePaths?.([])
    setShowClearModal(false)
  }

  const cancelClear = () => {
    setShowClearModal(false)
  }

  const changeColor = (color) => {
    setStrokeColor(color)
  }

  return (
    <div className="relative w-full max-w-2xl h-[550px] ring-2 ring-secondary/20 rounded overflow-hidden overflow-x-auto">
      {/* Панель инструментов */}
      <ul className="menu menu-xs menu-horizontal w-full py-2 bg-base-200">
        <li>
          <button onClick={undo}>
            <ArrowTurnLeftDownIcon className="w-4" />
          </button>
        </li>
        <li>
          <button onClick={redo}>
            <ArrowTurnRightDownIcon className="w-4" />
          </button>
        </li>
        <li>
          <button onClick={requestClear}>
            <TrashIcon className="w-4" />
          </button>
        </li>
        <li>
          <button onClick={() => changeColor('red')} className={`${strokeColor === 'red' ? "text-red-700 bg-red-200": "text-red-400"}`}>
            <PencilIcon className="w-4" />
          </button>
        </li>
        <li>
          <button onClick={() => changeColor('green')} className={`${strokeColor === 'green' ? "text-green-700 bg-green-200": "text-green-400"}`}>
            <PencilIcon className="w-4" />
          </button>
        </li>
        <li>
          <button onClick={() => changeColor('blue')} className={`${strokeColor === 'blue' ? "text-blue-700 bg-blue-200": "text-blue-400"}`}>
            <PencilIcon className="w-4" />
          </button>
        </li>
      </ul>

      {/* Ключевая обёртка с overflow-x-scroll и min-w */}
      <div className="mx-auto h-[550px] min-w-2xl" style={{ width: '100%', minWidth: '360px', maxWidth: '100%', display: 'block' }}>
        <ReactSketchCanvas
          ref={canvasRef}
          width="100%"
          height="100%"
          strokeWidth={1}
          strokeColor={strokeColor}
          canvasColor="transparent"
          style={{ touchAction: 'none' }}
          defaultValue={initialPaths}
          onStroke={handleStroke}
        />
      </div>

      {/* Модалка подтверждения очистки */}
      {showClearModal && (
        <dialog open className="modal modal-open modal-bottom md:modal-middle">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{t.courses.clear_drawing}</h3>
            <p className="py-2">{t.courses.impossible_recover}</p>
            <div className="modal-action">
              <button className="btn btn-error btn-sm" onClick={confirmClear}>{t.common.delete}</button>
              <button className="btn btn-sm" onClick={cancelClear}>{t.common.cancel}</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}