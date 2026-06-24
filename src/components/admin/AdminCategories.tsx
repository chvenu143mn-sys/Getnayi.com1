import React from 'react';
import { Search, Loader2, GripVertical, ImagePlus, Save, X, Edit2, Trash2, Briefcase } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableCategoryItem({
  cat,
  editingCategory,
  editingCategoryName,
  setEditingCategory,
  setEditingCategoryName,
  editingCategoryImageUrl,
  setEditingCategoryImageUrl,
  isUploadingCategoryImage,
  handleUploadCategoryImage,
  handleUpdateCategory,
  handleDeleteCategory,
  isSelected,
  onSelect
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-5 flex items-center justify-between group transition-all",
        isDragging ? "bg-[#2a2a2e] shadow-[0_0_20px_rgba(0,0,0,0.5)] ring-1 ring-[#4A63F3] rounded-lg relative z-50" : "hover:bg-white/[0.02]"
      )}
    >
      {editingCategory === cat.id ? (
        <div className="flex flex-col sm:flex-row flex-1 items-start sm:items-center gap-3 w-full">
          <input
            type="text"
            autoFocus
            value={editingCategoryName}
            onChange={(e) => setEditingCategoryName(e.target.value)}
            className="bg-[#0c0c0e]/40 text-white rounded-lg px-3 py-2 text-[14px] focus:outline-none border border-white/10 focus:border-blue-500 w-full sm:flex-1 sm:max-w-[200px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdateCategory(cat.id);
              if (e.key === 'Escape') setEditingCategory(null);
            }}
          />
          <div className="w-full sm:flex-1 sm:max-w-[250px] flex items-center gap-2">
            <input
              type="text"
              placeholder="Image URL"
              value={editingCategoryImageUrl}
              onChange={(e) => setEditingCategoryImageUrl(e.target.value)}
              className="bg-[#0c0c0e]/40 text-white rounded-lg px-3 py-2 text-[14px] focus:outline-none border border-white/10 focus:border-blue-500 w-full"
            />
            <label className="cursor-pointer p-2 text-zinc-400 hover:text-white rounded-lg transition-all h-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              {isUploadingCategoryImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              <input type="file" className="hidden" accept="image/*" onChange={handleUploadCategoryImage} disabled={isUploadingCategoryImage} />
            </label>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" aria-label="button" 
              onClick={() => handleUpdateCategory(cat.id)}
              className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-all"
            >
              <Save className="size-5" />
            </button>
            <button type="button" aria-label="button" 
              onClick={() => {
                setEditingCategory(null);
                setEditingCategoryImageUrl('');
              }}
              className="p-2 text-zinc-400 hover:text-white rounded-lg transition-all"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-3">
            {onSelect && (
              <input
                type="checkbox"
                checked={isSelected || false}
                onChange={(e) => onSelect(cat.id, e.target.checked)}
                className="size-4 rounded border-white/20 bg-[#0c0c0e]/50 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
            )}
            <button type="button" aria-label="button" 
              {...attributes}
              {...listeners}
              className="p-2 -ml-2 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-white transition-colors shrink-0"
              title="Drag to reorder"
            >
              <GripVertical className="size-4" />
            </button>
            {cat.image_url ? (
              <img src={cat.image_url} alt={cat.name} className="size-10 rounded-md object-cover border border-white/10 mx-1 shrink-0 bg-white/5" />
            ) : (
              <div className="size-10 rounded-md bg-white/5 border border-white/10 mx-1 shrink-0 flex items-center justify-center">
                <ImagePlus className="size-4 text-zinc-500" />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="font-bold text-white tracking-wide text-[15px]">{cat.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-zinc-500 font-mono">{cat.id.substring(0,8)}...</span>
                <span className="text-[11px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-medium">
                  {cat.videoCount || 0} usage{(cat.videoCount || 0) === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="button" 
              onClick={() => {
                setEditingCategory(cat.id);
                setEditingCategoryName(cat.name);
                setEditingCategoryImageUrl(cat.image_url || '');
              }}
              className="p-2 text-blue-400/50 hover:bg-blue-400/10 hover:text-blue-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Edit2 className="size-[18px]" />
            </button>
            <button type="button" aria-label="button" 
              onClick={() => handleDeleteCategory(cat.id, cat.name)}
              className="p-2 text-red-500/50 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="size-[18px]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCategories({
  categories,
  categorySearchTerm,
  setCategorySearchTerm,
  selectedCategories,
  setSelectedCategories,
  handleBulkDelete,
  handleCreateCategory,
  newCategoryName,
  setNewCategoryName,
  sensors,
  handleDragEnd,
  editingCategory,
  editingCategoryName,
  setEditingCategory,
  setEditingCategoryName,
  editingCategoryImageUrl,
  setEditingCategoryImageUrl,
  isUploadingCategoryImage,
  handleUploadCategoryImage,
  handleUpdateCategory,
  handleDeleteCategory
}: any) {
  const filteredCategories = categories.filter((c: any) => c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()));
  return (
    <div className="gap-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      <div className="bg-[#161619] border border-[#F97316]/20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(249,115,22,0.05)]">
         <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-[16px] font-display">Manage Categories</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-white/10 text-white/80 py-1 px-3 rounded-full text-[12px] font-semibold">{filteredCategories.length} Categories</span>
              {selectedCategories.length > 0 && (
                <button type="button" aria-label="button" 
                  onClick={handleBulkDelete}
                  className="bg-red-500/20 text-red-500 hover:bg-red-500/30 py-1 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="size-3" />
                  Delete Selected ({selectedCategories.length})
                </button>
              )}
            </div>
          </div>
          <div className="w-full sm:w-auto relative">
             <Search className="size-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
             <input
               type="text"
               placeholder="Find category..."
               value={categorySearchTerm}
               onChange={(e) => setCategorySearchTerm(e.target.value)}
               className="w-full sm:w-[250px] bg-[#0c0c0e]/40 text-white placeholder-zinc-500 rounded-xl pl-9 pr-4 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-blue-500 border border-white/5"
             />
          </div>
         </div>
         
         <div className="p-5 border-b border-white/5 bg-[#131316]">
            <form onSubmit={handleCreateCategory} className="flex gap-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="E.g., Skincare, Fragrance..."
                className="flex-1 bg-[#0c0c0e]/40 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-blue-500 border border-white/5"
              />
              <button aria-label="button" 
                type="submit"
                disabled={!newCategoryName.trim()}
                className="bg-[#F97316] hover:bg-[#F97316]/90 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-colors text-[14px]"
              >
                Add
              </button>
            </form>
         </div>

         {categories.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 flex flex-col items-center">
            <Briefcase className="size-12 mb-3 opacity-20" />
            <p className="font-display tracking-wide font-medium">No categories found.</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="font-display tracking-wide font-medium">No matching categories.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredCategories} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-white/5">
                {filteredCategories.map((cat: any) => (
                  <SortableCategoryItem
                    key={cat.id}
                    cat={cat}
                    editingCategory={editingCategory}
                    editingCategoryName={editingCategoryName}
                    setEditingCategory={setEditingCategory}
                    setEditingCategoryName={setEditingCategoryName}
                    editingCategoryImageUrl={editingCategoryImageUrl}
                    setEditingCategoryImageUrl={setEditingCategoryImageUrl}
                    isUploadingCategoryImage={isUploadingCategoryImage}
                    handleUploadCategoryImage={handleUploadCategoryImage}
                    handleUpdateCategory={handleUpdateCategory}
                    handleDeleteCategory={handleDeleteCategory}
                    isSelected={selectedCategories.includes(cat.id)}
                    onSelect={(id: string, selected: boolean) => {
                      setSelectedCategories((prev: any) => selected ? [...prev, id] : prev.filter((c: any) => c !== id))
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
