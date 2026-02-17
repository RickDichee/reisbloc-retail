import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

interface OrderNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (note: string) => void
  initialNote?: string
  itemName?: string
}

// Etiquetas comunes para Cevicheria Mexa
const QUICK_TAGS = [
  'Sin cebolla', 'Sin cilantro', 'Salsa aparte', 
  'Sin hielo', 'Poca sal', 'Bien cocido', 
  'Extra picante', 'Sin picante', 'Gluten Free', 
  'Alergia', 'Para llevar', 'Extra limón'
]

export default function OrderNoteModal({ isOpen, onClose, onSave, initialNote = '', itemName }: OrderNoteModalProps) {
  const [note, setNote] = useState(initialNote)

  useEffect(() => {
    setNote(initialNote)
  }, [initialNote, isOpen])

  if (!isOpen) return null

  const toggleTag = (tag: string) => {
    // Lógica simple para agregar/quitar tags del texto
    if (note.includes(tag)) {
      setNote(note.replace(tag, '').replace(', ,', ',').trim().replace(/^,|,$/g, ''))
    } else {
      setNote(prev => prev ? `${prev}, ${tag}` : tag)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-900">
            Nota para: <span className="text-indigo-600">{itemName || 'Orden'}</span>
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Tags Rápidos */}
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                  note.includes(tag)
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Escribe instrucciones especiales aquí..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
            autoFocus
          />
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">Cancelar</button>
          <button onClick={() => { onSave(note); onClose(); }} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2"><Save size={18} /> Guardar Nota</button>
        </div>
      </div>
    </div>
  )
}