import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChefHat, Bath, Shirt, Flame, Sofa, BedDouble, Package, Tag, LayoutGrid,
  Plus, Pencil, Trash2, ExternalLink, Image as ImageIcon, Loader2, Check, X,
  Link2, Lock, LogOut, Download, Upload, Wand2, Bookmark, ShieldCheck,
} from "lucide-react";
import { supabase } from "./supabaseClient";

// ------------------------------------------------------------------
// CONFIG — troque a senha do modo admin aqui
// ------------------------------------------------------------------
const ADMIN_PASSWORD = "gabrielaerian2026";
const PHOTOS_BUCKET = "item-photos";

const DEFAULT_CATEGORIES = [
  { id: "cozinha", label: "Cozinha", icon: "ChefHat" },
  { id: "banheiro", label: "Banheiro", icon: "Bath" },
  { id: "lavanderia", label: "Lavanderia", icon: "Shirt" },
  { id: "area-gourmet", label: "Área Gourmet", icon: "Flame" },
  { id: "sala", label: "Sala", icon: "Sofa" },
  { id: "quarto-casal", label: "Quarto de Casal", icon: "BedDouble" },
  { id: "outros", label: "Outros", icon: "Package" },
];

const STATUS = {
  nao_comprado: { label: "Não comprado", badge: "bg-[#EDE7DC] text-warmgray" },
  reservado: { label: "Reservado", badge: "bg-blush-light text-terracotta-dark" },
  comprado: { label: "Já comprado", badge: "bg-olive-light/40 text-olive-dark" },
};

const ICONS = { ChefHat, Bath, Shirt, Flame, Sofa, BedDouble, Package, Tag, LayoutGrid };

function CategoryIcon({ name, ...props }) {
  const Cmp = ICONS[name] || Tag;
  return <Cmp {...props} />;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatPrice(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function genFileName(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `${id}.${ext}`;
}

async function fetchMetadata(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);
  try {
    const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxied, { signal: controller.signal });
    if (!res.ok) throw new Error("fetch failed");
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const getMeta = (p) =>
      doc.querySelector(`meta[property="${p}"]`)?.content ||
      doc.querySelector(`meta[name="${p}"]`)?.content || "";
    let title = getMeta("og:title") || doc.querySelector("title")?.textContent || "";
    let image = getMeta("og:image") || getMeta("twitter:image") || "";
    title = title.trim();
    if (image && !/^https?:\/\//i.test(image)) {
      try { image = new URL(image, url).href; } catch { image = ""; }
    }
    if (!title && !image) throw new Error("no metadata");
    return { title, image };
  } finally {
    clearTimeout(timeoutId);
  }
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- mapeamento entre o formato do app e as colunas do Supabase ----
function rowToItem(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    image: row.image_url || "",
    url: row.product_url || "",
    price: row.price !== null && row.price !== undefined ? String(row.price) : "",
    status: row.status || "nao_comprado",
    notes: row.notes || "",
    createdAt: row.created_at,
  };
}

function itemToRow(item) {
  return {
    category: item.category,
    title: item.title,
    image_url: item.image || null,
    product_url: item.url,
    price: item.price === "" || item.price === null || item.price === undefined ? null : Number(item.price),
    status: item.status,
    notes: item.notes || null,
  };
}

// ------------------------------------------------------------------
// Small presentational pieces
// ------------------------------------------------------------------
function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.nao_comprado;
  return (
    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${s.badge}`}>
      {s.label}
    </span>
  );
}

function ProductCard({ item, categoryLabel, isAdmin, onEdit, onDelete, onReserve, onChangeStatus }) {
  const [confirming, setConfirming] = useState(false);
  const price = formatPrice(item.price);

  return (
    <div className="bg-paper rounded-2xl overflow-hidden border border-line flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-[4/3] bg-[#F1ECE3] flex items-center justify-center overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-warmgray/70">
            <ImageIcon size={22} strokeWidth={1.5} />
            <span className="text-[11px]">sem foto</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-medium leading-snug text-ink">{item.title || "Item sem título"}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={item.status} />
          <span className="text-[11px] text-warmgray">{categoryLabel}</span>
          {price && <span className="text-[12.5px] font-semibold text-olive-dark ml-auto">{price}</span>}
        </div>

        {item.notes && (
          <p className="text-[12.5px] text-warmgray leading-snug line-clamp-2">{item.notes}</p>
        )}

        <div className="flex items-center gap-2 mt-1">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-medium px-3 py-2 rounded-xl bg-olive text-white hover:bg-olive-dark transition-colors"
          >
            Ver produto <ExternalLink size={12} />
          </a>

          {!isAdmin && item.status === "nao_comprado" && (
            <button
              onClick={() => onReserve(item.id)}
              title="Reservar este item"
              className="p-2 rounded-xl border border-line text-terracotta hover:bg-blush-light transition-colors"
            >
              <Bookmark size={15} />
            </button>
          )}

          {isAdmin && (
            <>
              <button onClick={() => onEdit(item)} className="p-2 rounded-xl border border-line text-ink hover:bg-cream transition-colors" title="Editar">
                <Pencil size={15} />
              </button>
              {!confirming ? (
                <button onClick={() => setConfirming(true)} className="p-2 rounded-xl border border-line text-terracotta-dark hover:bg-blush-light transition-colors" title="Excluir">
                  <Trash2 size={15} />
                </button>
              ) : null}
            </>
          )}
        </div>

        {confirming && (
          <div className="flex items-center gap-1.5 text-[12px] mt-1">
            <span className="text-warmgray mr-auto">Excluir este item?</span>
            <button onClick={() => { onDelete(item.id); setConfirming(false); }} className="px-2.5 py-1 rounded-lg text-white bg-terracotta-dark">Sim</button>
            <button onClick={() => setConfirming(false)} className="px-2.5 py-1 rounded-lg bg-cream text-ink">Não</button>
          </div>
        )}

        {isAdmin && (
          <select
            value={item.status}
            onChange={(e) => onChangeStatus(item.id, e.target.value)}
            className="mt-1 text-[12px] px-2.5 py-1.5 rounded-lg border border-line bg-white text-ink outline-none"
          >
            {Object.entries(STATUS).map(([value, s]) => (
              <option key={value} value={value}>{s.label}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function LoginModal({ onClose, onSubmit, error }) {
  const [password, setPassword] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-ink/50" onClick={onClose}>
      <div className="bg-paper rounded-2xl p-6 max-w-xs w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3 text-terracotta-dark">
          <Lock size={16} />
          <p className="text-[11px] font-semibold tracking-wide uppercase">Área dos Noivos</p>
        </div>
        <p className="text-[13.5px] text-ink mb-3">Digite a senha para entrar no modo de edição.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmit(password); }}
          className="w-full px-3 py-2.5 rounded-xl border border-line outline-none text-[13.5px] mb-2 focus:border-olive"
          placeholder="Senha"
        />
        {error && <p className="text-[12px] text-terracotta-dark mb-2">{error}</p>}
        <div className="flex gap-2 mt-2">
          <button onClick={() => onSubmit(password)} className="flex-1 py-2.5 rounded-xl bg-olive text-white text-[13px] font-medium hover:bg-olive-dark transition-colors">Entrar</button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-cream text-ink text-[13px] font-medium">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function ProductModal({ initialItem, categories, onSave, onClose }) {
  const [form, setForm] = useState(initialItem);
  const [fetchState, setFetchState] = useState("idle"); // idle | loading
  const [photoUploading, setPhotoUploading] = useState(false);
  const [formError, setFormError] = useState("");

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleFetchMeta = async () => {
    if (!/^https?:\/\/.+/i.test((form.url || "").trim())) {
      setFormError("Cole um link válido, começando com http:// ou https://");
      return;
    }
    setFormError("");
    setFetchState("loading");
    try {
      const meta = await fetchMetadata(form.url.trim());
      update({ title: meta.title || form.title, image: meta.image || form.image });
    } catch {
      setFormError("Não conseguimos puxar os dados automaticamente. Preencha manualmente.");
    } finally {
      setFetchState("idle");
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setFormError("");
    try {
      const path = genFileName(file);
      const { error: uploadError } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
      update({ image: data.publicUrl });
    } catch {
      setFormError("Não foi possível enviar a foto. Confira se o bucket 'item-photos' existe e está público.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.title || !form.title.trim()) {
      setFormError("Dá um título pro produto antes de salvar.");
      return;
    }
    if (!form.category) {
      setFormError("Escolha uma categoria.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-ink/50 overflow-y-auto" onClick={onClose}>
      <div className="bg-paper rounded-2xl p-6 max-w-lg w-full shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-semibold tracking-wide uppercase text-terracotta-dark mb-1">
          {form.id ? "Editar produto" : "Novo produto"}
        </p>
        <h2 className="font-display text-[22px] text-ink mb-4">{form.id ? "Editar item" : "Adicionar item"}</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12.5px] text-ink font-medium block mb-1">Link da loja</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-line">
                <Link2 size={14} className="text-warmgray shrink-0" />
                <input
                  value={form.url}
                  onChange={(e) => update({ url: e.target.value })}
                  placeholder="https://..."
                  className="w-full text-[13.5px] outline-none bg-transparent"
                />
              </div>
              <button
                onClick={handleFetchMeta}
                disabled={fetchState === "loading"}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-olive text-white text-[12.5px] font-medium shrink-0 disabled:opacity-70"
              >
                {fetchState === "loading" ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {fetchState === "loading" ? "Buscando..." : "Tentar puxar dados"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[12.5px] text-ink font-medium block mb-1">Título do produto</label>
            <input
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Ex: Jogo de panelas antiaderente 5 peças"
              className="w-full px-3 py-2 rounded-xl border border-line outline-none text-[13.5px]"
            />
          </div>

          <div>
            <label className="text-[12.5px] text-ink font-medium block mb-1">Imagem</label>
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-xl bg-[#F1ECE3] shrink-0 overflow-hidden flex items-center justify-center">
                {photoUploading ? (
                  <Loader2 size={16} className="animate-spin text-warmgray" />
                ) : form.image ? (
                  <img src={form.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={16} className="text-warmgray" />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <input
                  value={form.image}
                  onChange={(e) => update({ image: e.target.value })}
                  placeholder="URL da imagem (opcional)"
                  className="w-full px-3 py-2 rounded-xl border border-line outline-none text-[13.5px]"
                />
                <label className="flex items-center gap-1.5 text-[12px] text-warmgray cursor-pointer w-fit">
                  <Upload size={12} />
                  <span>{photoUploading ? "Enviando..." : "Ou envie uma foto do aparelho"}</span>
                  <input type="file" accept="image/*" className="hidden" disabled={photoUploading} onChange={handlePhotoUpload} />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12.5px] text-ink font-medium block mb-1">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => update({ category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-line outline-none text-[13.5px] bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12.5px] text-ink font-medium block mb-1">Preço estimado (R$)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => update({ price: e.target.value })}
                placeholder="Opcional"
                className="w-full px-3 py-2 rounded-xl border border-line outline-none text-[13.5px]"
              />
            </div>
          </div>

          <div>
            <label className="text-[12.5px] text-ink font-medium block mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => update({ status: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-line outline-none text-[13.5px] bg-white"
            >
              {Object.entries(STATUS).map(([value, s]) => (
                <option key={value} value={value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12.5px] text-ink font-medium block mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Ex: cor preferencial inox, tamanho P, etc."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-line outline-none text-[13.5px] resize-none"
            />
          </div>

          {formError && <p className="text-[12.5px] text-terracotta-dark">{formError}</p>}

          <div className="flex items-center gap-2 mt-2">
            <button onClick={handleSave} disabled={photoUploading} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-olive text-white text-[13px] font-medium hover:bg-olive-dark transition-colors disabled:opacity-70">
              <Check size={14} /> Salvar
            </button>
            <button onClick={onClose} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cream text-ink text-[13px] font-medium">
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddCategoryModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-ink/50" onClick={onClose}>
      <div className="bg-paper rounded-2xl p-6 max-w-xs w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-semibold tracking-wide uppercase text-terracotta-dark mb-3">Nova categoria</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); }}
          placeholder="Ex: Escritório"
          className="w-full px-3 py-2.5 rounded-xl border border-line outline-none text-[13.5px] mb-3"
        />
        <div className="flex gap-2">
          <button onClick={() => name.trim() && onSave(name.trim())} className="flex-1 py-2.5 rounded-xl bg-olive text-white text-[13px] font-medium">Adicionar</button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-cream text-ink text-[13px] font-medium">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// App
// ------------------------------------------------------------------
export default function App() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeCategory, setActiveCategory] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");

  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const importInputRef = useRef(null);

  const loadItems = async () => {
    const { data, error } = await supabase.from("items").select("*").order("created_at", { ascending: true });
    if (!error) setItems((data || []).map(rowToItem));
    return error;
  };

  const loadAll = async () => {
    setLoading(true);
    setLoadError("");
    try {
      let { data: catRows, error: catErr } = await supabase.from("categories").select("*").order("created_at", { ascending: true });
      if (catErr) throw catErr;

      if (!catRows || catRows.length === 0) {
        const { error: seedErr } = await supabase
          .from("categories")
          .insert(DEFAULT_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon })));
        if (!seedErr) {
          const res2 = await supabase.from("categories").select("*").order("created_at", { ascending: true });
          catRows = res2.data;
        } else {
          catRows = DEFAULT_CATEGORIES;
        }
      }
      setCategories((catRows || DEFAULT_CATEGORIES).map((c) => ({ id: c.id, label: c.label, icon: c.icon })));

      const itemErr = await loadItems();
      if (itemErr) throw itemErr;
    } catch (e) {
      setLoadError("Não foi possível conectar ao banco de dados. Confira as chaves em src/config.js.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ---- actions ----
  const handleLogin = (password) => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setLoginError("");
    } else {
      setLoginError("Senha incorreta.");
    }
  };

  const openAddModal = () => {
    setEditingItem({
      id: null, url: "", title: "", image: "",
      category: activeCategory !== "todas" ? activeCategory : categories[0]?.id || "outros",
      price: "", status: "nao_comprado", notes: "",
    });
    setShowProductModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem({ ...item });
    setShowProductModal(true);
  };

  const saveProduct = async (form) => {
    const row = itemToRow(form);
    const { error } = form.id
      ? await supabase.from("items").update(row).eq("id", form.id)
      : await supabase.from("items").insert(row);
    if (error) { alert("Não foi possível salvar o item. Tenta de novo."); return; }
    setShowProductModal(false);
    setEditingItem(null);
    await loadItems();
  };

  const deleteProduct = async (id) => {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const changeStatus = async (id, status) => {
    const { error } = await supabase.from("items").update({ status }).eq("id", id);
    if (!error) setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const reserveItem = (id) => {
    if (confirm("Reservar este item pra você?")) changeStatus(id, "reservado");
  };

  const addCategory = async (label) => {
    const id = slugify(label);
    if (categories.some((c) => c.id === id)) {
      alert("Já existe uma categoria com esse nome.");
      return;
    }
    const { error } = await supabase.from("categories").insert({ id, label, icon: "Tag" });
    if (error) { alert("Não foi possível criar a categoria."); return; }
    setCategories((prev) => [...prev, { id, label, icon: "Tag" }]);
    setActiveCategory(id);
    setShowCategoryModal(false);
  };

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadJSON(items, `enxoval-itens-backup-${date}.json`);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error("formato inválido");
        if (!confirm(`Importar ${parsed.length} itens? Isso substitui TODOS os itens atuais no banco — visível pra todo mundo que abrir o site.`)) {
          e.target.value = "";
          return;
        }
        const { error: delError } = await supabase.from("items").delete().not("id", "is", null);
        if (delError) throw delError;
        const rows = parsed.map(itemToRow);
        const { error: insError } = await supabase.from("items").insert(rows);
        if (insError) throw insError;
        await loadItems();
      } catch {
        alert("Não foi possível importar esse arquivo. Confira se é um JSON exportado daqui mesmo.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const displayedCategories = useMemo(
    () => [{ id: "todas", label: "Todos os itens", icon: "LayoutGrid" }, ...categories],
    [categories]
  );

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const catOk = activeCategory === "todas" || i.category === activeCategory;
      const statusOk = statusFilter === "todos" || i.status === statusFilter;
      return catOk && statusOk;
    });
  }, [items, activeCategory, statusFilter]);

  const categoryLabel = (id) => categories.find((c) => c.id === id)?.label || "Outros";

  return (
    <div className="min-h-screen bg-cream text-ink font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between gap-3">
          <p className="font-display text-[17px] text-ink">Enxoval de Casa Nova</p>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-medium text-olive-dark bg-olive-light/30 px-2.5 py-1 rounded-full">
                <ShieldCheck size={13} /> Modo Admin
              </span>
              <button onClick={() => setIsAdmin(false)} className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border border-line text-ink hover:bg-white transition-colors">
                <LogOut size={13} /> Sair
              </button>
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border border-line text-ink hover:bg-white transition-colors">
              <Lock size={13} /> Área dos Noivos
            </button>
          )}
        </div>
      </header>

      {/* HERO */}
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 pb-6 text-center">
        <p className="text-[11px] tracking-[0.2em] uppercase text-terracotta-dark mb-2">Nosso enxoval</p>
        <h1 className="font-display text-[34px] sm:text-[44px] leading-tight text-ink">Enxoval de Casa Nova</h1>
        <p className="font-display italic text-[20px] sm:text-[24px] text-olive-dark mt-1">Gabi &amp; Rian</p>
        <p className="text-[14px] text-warmgray max-w-md mx-auto mt-3 leading-relaxed">
          Escolhemos, com carinho, tudo que sonhamos pra nossa casa. Fica à vontade pra dar uma olhada — e, se quiser, reservar algum item.
        </p>
      </div>

      {/* ADMIN TOOLBAR */}
      {isAdmin && (
        <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-2">
          <div className="flex flex-wrap items-center gap-2 bg-white border border-line rounded-2xl p-3">
            <button onClick={openAddModal} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-2 rounded-xl bg-olive text-white hover:bg-olive-dark transition-colors">
              <Plus size={14} /> Adicionar Produto
            </button>
            <button onClick={() => setShowCategoryModal(true)} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-2 rounded-xl border border-line text-ink hover:bg-cream transition-colors">
              <Tag size={14} /> Nova categoria
            </button>
            <button onClick={handleExport} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-2 rounded-xl border border-line text-ink hover:bg-cream transition-colors">
              <Download size={14} /> Backup (Exportar JSON)
            </button>
            <button onClick={() => importInputRef.current?.click()} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-2 rounded-xl border border-line text-ink hover:bg-cream transition-colors">
              <Upload size={14} /> Restaurar (Importar JSON)
            </button>
            <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
          </div>
        </div>
      )}

      {/* CATEGORY TABS */}
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {displayedCategories.map((c) => {
            const count = c.id === "todas" ? items.length : items.filter((i) => i.category === c.id).length;
            const active = activeCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium px-3.5 py-2 rounded-full border transition-colors ${
                  active ? "bg-olive text-white border-olive" : "bg-white text-ink border-line hover:bg-cream"
                }`}
              >
                <CategoryIcon name={c.icon} size={14} />
                {c.label}
                <span className={`text-[10.5px] ${active ? "text-white/80" : "text-warmgray"}`}>{count}</span>
              </button>
            );
          })}
          {isAdmin && (
            <button onClick={() => setShowCategoryModal(true)} className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] font-medium px-3 py-2 rounded-full border border-dashed border-line text-warmgray hover:bg-white transition-colors">
              <Plus size={14} /> categoria
            </button>
          )}
        </div>

        {/* STATUS FILTER */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {[
            { id: "todos", label: "Todos" },
            { id: "nao_comprado", label: STATUS.nao_comprado.label },
            { id: "reservado", label: STATUS.reservado.label },
            { id: "comprado", label: STATUS.comprado.label },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === s.id ? "bg-terracotta text-white border-terracotta" : "bg-white text-warmgray border-line hover:bg-cream"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID */}
      <main className="max-w-5xl mx-auto px-5 sm:px-8 pb-16">
        {loadError && (
          <div className="text-[13px] px-4 py-3 rounded-xl bg-blush-light text-terracotta-dark mb-4">{loadError}</div>
        )}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-warmgray">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[13px]">Carregando itens...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 text-warmgray">
            <p className="text-[14px]">Nenhum item encontrado por aqui ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                categoryLabel={categoryLabel(item.category)}
                isAdmin={isAdmin}
                onEdit={openEditModal}
                onDelete={deleteProduct}
                onReserve={reserveItem}
                onChangeStatus={changeStatus}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-[12px] text-warmgray">feito com carinho pra nossa casa nova</footer>

      {/* MODALS */}
      {showLogin && (
        <LoginModal onClose={() => { setShowLogin(false); setLoginError(""); }} onSubmit={handleLogin} error={loginError} />
      )}
      {showProductModal && editingItem && (
        <ProductModal
          initialItem={editingItem}
          categories={categories}
          onSave={saveProduct}
          onClose={() => { setShowProductModal(false); setEditingItem(null); }}
        />
      )}
      {showCategoryModal && (
        <AddCategoryModal onSave={addCategory} onClose={() => setShowCategoryModal(false)} />
      )}
    </div>
  );
}
