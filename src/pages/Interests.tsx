import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, Check } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

export default function Interests() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('id, name').order('name');
      if (data) {
        setCategories(data);
      }
      setLoading(false);
    }
    fetchCategories();
  }, []);

  const toggleCategory = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      // Initialize interests in DB
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      
      const res = await fetch('/api/user/interests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ categoryIds: Array.from(selected) })
      });
      
      if (!res.ok) {
        throw new Error('Failed to initialize interests');
      }

      // Save to user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          interests: Array.from(selected),
          onboarded: true
        }
      });

      if (error) throw error;
    } catch (error) {
      setSaving(false);
      console.error(error);
      alert('Failed to save interests. Please try again.');
    }
    // No need to manually navigate or reload; 
    // AuthContext will detect the user metadata update via onAuthStateChange and App.tsx will redirect.
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[100dvh]">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 min-h-[100dvh] pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col flex-1"
      >
        <h1 className="text-3xl font-bold text-white mb-2 font-sans tracking-tight">What are you into?</h1>
        <p className="text-white/60 mb-8 font-sans">
          Pick a few things you love so we can customize your feed. You can always change these later.
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          {categories.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (selected.size === categories.length) {
                  setSelected(new Set());
                } else {
                  setSelected(new Set(categories.map(c => c.id)));
                }
              }}
              className={`px-5 py-3 rounded-full font-medium text-sm transition-all border ${
                selected.size === categories.length 
                  ? 'bg-[#d9183b] border-[#d9183b] text-white shadow-lg shadow-[#d9183b]/20' 
                  : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
              } flex items-center gap-2`}
            >
              All (Category)
              {selected.size === categories.length && <Check className="size-4" />}
            </motion.button>
          )}
          {categories.map((cat) => {
            const isSelected = selected.has(cat.id);
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleCategory(cat.id)}
                className={`px-5 py-3 rounded-full font-medium text-sm transition-all border ${
                  isSelected 
                    ? 'bg-[#d9183b] border-[#d9183b] text-white shadow-lg shadow-[#d9183b]/20' 
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                } flex items-center gap-2`}
              >
                {cat.name}
                {isSelected && <Check className="size-4" />}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-auto pb-4">
          <button type="button"
            onClick={handleSave}
            disabled={saving || (selected.size === 0 && categories.length > 0)}
            className="w-full py-4 px-6 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-sans"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
