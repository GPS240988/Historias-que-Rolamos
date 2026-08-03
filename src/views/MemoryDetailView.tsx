import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useRouter } from '../contexts/RouterContext';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { getCategoryColorClass } from './TimelineView';
import type { Character, Media, MemoryComment } from '../types';
import { MemoryModal } from '../components/memory/MemoryModal';
import {
  Calendar,
  Tag,
  Users,
  ArrowUpRight,
  Shield,
  X,
  Image as ImageIcon,
  Edit3,
  BookOpen,
  Scroll,
  MessageSquare,
  Plus,
  Trash2,
  Search
} from 'lucide-react';

interface MemoryDetailViewProps {
  id: string;
}

const getCategoryGradientClass = (type: string) => {
  switch (type) {
    case 'Batalha':
      return 'from-zinc-950 via-zinc-900/90 to-zinc-950/40 border-zinc-800';
    case 'Vitória':
    case 'Conquista':
      return 'from-green-950 via-green-900/80 to-emerald-950/20 border-green-800/40';
    case 'Derrota':
    case 'Tragédia':
      return 'from-medieval-wine/50 via-red-950/40 to-red-950/25 border-medieval-wine/50';
    case 'Descoberta':
    case 'Exploração':
      return 'from-blue-950 via-blue-900/80 to-cyan-950/20 border-blue-800/40';
    case 'Relacionamento':
      return 'from-pink-950/50 via-rose-950/40 to-rose-950/25 border-rose-900/30';
    case 'Momento Lendário':
      return 'from-medieval-gold/20 via-amber-950/30 to-medieval-stone border-medieval-gold/30';
    case 'Conhecimento':
      return 'from-purple-950 via-purple-900/80 to-violet-950/20 border-purple-800/30';
    case 'Momento Engraçado':
      return 'from-amber-950/50 via-amber-900/40 to-orange-950/25 border-amber-800/30';
    default:
      return 'from-medieval-stone to-medieval-charcoal border-medieval-gold/15';
  }
};

export const MemoryDetailView: React.FC<MemoryDetailViewProps> = ({ id }) => {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<string>('mestre');
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentDate, setCommentDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentFilterText, setCommentFilterText] = useState('');
  const [commentVisibleCount, setCommentVisibleCount] = useState(5);
  const [editingComment, setEditingComment] = useState<MemoryComment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  const memory = useLiveQuery(() => db.memories.get(id), [id]);
  const imageUrl = useMediaUrl(memory?.imageId);

  const linkedPhotos = useLiveQuery(() => {
    if (!memory) return [];
    return db.media.where('campaignId').equals(memory.campaignId).filter(m => m.relatedMemoryId === id).toArray();
  }, [id, memory]) || [];

  const participants = useLiveQuery(async () => {
    if (!memory) return [];
    const chars = [];
    for (const charId of memory.characterIds) {
      const char = await db.characters.get(charId);
      if (char) {
        const rel = await db.memoryCharacters
          .where('memoryId')
          .equals(memory.id)
          .filter(r => r.characterId === char.id)
          .first();
        chars.push({ character: char, levelReached: rel?.levelReached });
      }
    }
    return chars;
  }, [memory]);

  const allCharacters = useLiveQuery(async () => {
    if (!memory) return [];
    return db.characters.where('campaignId').equals(memory.campaignId).toArray();
  }, [memory?.campaignId]) || [];

  const saveCommentsToDb = async (updatedComments: MemoryComment[]) => {
    if (memory) {
      try {
        await db.memories.put({ ...memory, comments: updatedComments, updatedAt: new Date().toISOString() });
      } catch (err: any) {
        setCommentError('Erro ao salvar no banco de dados: ' + err.message);
      }
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) { setCommentError('O comentário não pode estar vazio.'); return; }
    if (!commentAuthor.trim()) { setCommentError('Selecione quem está fazendo o comentário.'); return; }

    if (editingComment) {
      const updated = (memory?.comments || []).map(c => c.id === editingComment.id ? { ...c, date: commentDate, comment: commentText.trim(), author: commentAuthor.trim() } : c);
      await saveCommentsToDb(updated);
      setEditingComment(null);
    } else {
      const entry: MemoryComment = { id: crypto.randomUUID(), date: commentDate, comment: commentText.trim(), author: commentAuthor.trim() };
      await saveCommentsToDb([entry, ...(memory?.comments || [])]);
    }
    setCommentText(''); setCommentAuthor(''); setCommentDate(new Date().toISOString().substring(0, 10)); setCommentError(null);
  };

  const handleEditComment = (cmt: MemoryComment) => { setEditingComment(cmt); setCommentText(cmt.comment); setCommentAuthor(cmt.author); setCommentDate(cmt.date); setCommentError(null); };
  const handleCancelEditComment = () => { setEditingComment(null); setCommentText(''); setCommentAuthor(''); setCommentDate(new Date().toISOString().substring(0, 10)); setCommentError(null); };
  const handleDeleteComment = async (commentId: string) => { await saveCommentsToDb((memory?.comments || []).filter(c => c.id !== commentId)); setDeleteConfirmId(null); };

  const filteredComments = useMemo<MemoryComment[]>(() => {
    if (!memory?.comments) return [];
    let list = [...memory.comments];
    if (commentFilterText.trim()) { const q = commentFilterText.toLowerCase().trim(); list = list.filter(c => c.comment.toLowerCase().includes(q)); }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [memory?.comments, commentFilterText]);

  const visibleComments = filteredComments.slice(0, commentVisibleCount);
  const hasMoreComments = filteredComments.length > commentVisibleCount;

  if (memory === undefined) return <div className="text-center py-12 font-medieval text-medieval-gold text-lg animate-pulse">Lendo Memória do Evento...</div>;
  if (memory === null) return (
    <div className="grimoire-card p-8 text-center text-medieval-silver font-serif max-w-md mx-auto">
      Memória não encontrada nos pergaminhos da campanha.
      <button onClick={() => navigate({ type: 'timeline' })} className="block mx-auto mt-4 btn-stone py-1 px-3 text-xs">Voltar à Linha do Tempo</button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in font-serif">

      <div className={`relative w-full min-h-[220px] md:h-80 rounded-lg overflow-hidden border shadow-gold bg-medieval-charcoal/80 flex items-end p-5 md:p-8 ${getCategoryGradientClass(memory.type)}`}>
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={memory.title} className="absolute inset-0 w-full h-full object-cover filter brightness-[0.45] contrast-[1.05] transition-transform duration-700 hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/65 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br opacity-40 mix-blend-overlay flex items-center justify-center text-medieval-gold/5 pointer-events-none">
            <Shield className="w-48 h-48 stroke-[0.8]" />
          </div>
        )}
        <div className="absolute top-4 left-4 z-10">
          <button onClick={() => setEditModalOpen(true)} className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-medieval-charcoal/80 hover:bg-medieval-stone border border-medieval-gold/30 text-medieval-gold hover:text-medieval-brightGold text-[11px] font-medieval uppercase tracking-wider backdrop-blur-sm transition-all shadow-md active:scale-95 cursor-pointer">
            <Edit3 className="w-3.5 h-3.5" /><span>Editar</span>
          </button>
        </div>
        <div className="absolute top-4 right-4 z-10">
          <span className={`text-[10px] font-serif uppercase tracking-widest px-3 py-1 border rounded shadow-md backdrop-blur-sm ${getCategoryColorClass(memory.type)}`}>{memory.type}</span>
        </div>
        <div className="relative z-10 w-full space-y-2 md:space-y-3">
          <div className="flex items-center space-x-2 text-medieval-silver/80 text-[11px] font-serif">
            <Calendar className="w-4 h-4 text-medieval-gold shrink-0" />
            <span>Registrado em: {new Date(memory.eventDate).toLocaleDateString('pt-BR')}</span>
          </div>
          <h2 className="text-xl md:text-3xl lg:text-4xl font-bold font-medieval text-medieval-brightGold tracking-wider break-words whitespace-normal leading-tight drop-shadow-md select-text">{memory.title}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grimoire-card p-5 md:p-6 space-y-6">
            <div className="flex flex-wrap gap-2 border-b border-medieval-gold/10 pb-4">
              <button
                type="button"
                onClick={() => setActiveTab('mestre')}
                className={`py-2 px-3 rounded border text-[10px] sm:text-xs font-medieval tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer hover:border-medieval-gold/50 ${activeTab === 'mestre'
                  ? 'bg-medieval-gold/10 border-medieval-gold text-medieval-brightGold shadow-[0_0_10px_rgba(197,168,128,0.1)]'
                  : 'bg-medieval-charcoal/40 border-medieval-gold/10 text-medieval-silver'
                }`}
              >
                <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'mestre' ? 'text-medieval-brightGold animate-pulse' : 'text-medieval-silver/60'}`} />
                <span className="font-bold">Mestre</span>
              </button>

              {allCharacters
                .filter(char => char.characterType !== 'ally')
                .map(char => (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setActiveTab(char.id)}
                    className={`py-2 px-3 rounded border text-[10px] sm:text-xs font-medieval tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer hover:border-medieval-gold/50 ${activeTab === char.id
                      ? 'bg-medieval-gold/15 border-medieval-gold text-medieval-brightGold shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                      : 'bg-medieval-charcoal/40 border-medieval-gold/10 text-medieval-silver'
                    }`}
                  >
                    <Scroll className={`w-3.5 h-3.5 ${activeTab === char.id ? 'text-medieval-gold animate-pulse' : 'text-medieval-silver/60'}`} />
                    <span className="font-bold">{char.name}</span>
                  </button>
                ))}
            </div>

            <div className="relative p-4 md:p-6 bg-medieval-charcoal/40 border-l-2 border-medieval-gold/30 rounded-r min-h-[160px] shadow-inner select-text">
              {activeTab === 'mestre' && (
                <div className="animate-fade-in space-y-2">
                  <h4 className="text-[9px] font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5 mb-2 opacity-80"><BookOpen className="w-3 h-3 text-medieval-gold" /><span>Pergaminho Sagrado do Mestre</span></h4>
                  <p className="text-sm sm:text-base text-medieval-parchment leading-relaxed text-justify whitespace-pre-line font-serif pl-1 first-letter:text-4xl first-letter:font-medieval first-letter:font-bold first-letter:text-medieval-brightGold first-letter:float-left first-letter:mr-2 first-letter:leading-none">{memory.description}</p>
                </div>
              )}
              {allCharacters
                .filter(char => char.characterType !== 'ally')
                .map(char => {
                  if (activeTab !== char.id) return null;
                  const recordText = memory.heroDescriptions?.[char.id] || '';
                  return (
                    <div key={char.id} className="animate-fade-in space-y-2">
                      <h4 className="text-[9px] font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5 mb-2 opacity-80">
                        <Scroll className="w-3 h-3 text-medieval-gold" />
                        <span>Diário de Batalha de {char.name}</span>
                      </h4>
                      <p className="text-sm sm:text-base text-medieval-parchment/90 leading-relaxed text-justify whitespace-pre-line font-serif pl-1 italic">
                        {recordText.trim() || `Nenhum registro de ${char.name} anotado para esta memória.`}
                      </p>
                    </div>
                  );
                })}
            </div>

            {memory.tags.length > 0 && (
              <div className="flex items-center space-x-2 border-t border-medieval-gold/10 pt-4 font-serif text-xs">
                <Tag className="w-3.5 h-3.5 text-medieval-gold shrink-0" />
                <span className="text-medieval-silver text-[10px] font-bold uppercase tracking-wider font-medieval">Etiquetas:</span>
                <div className="flex flex-wrap gap-1.5">{memory.tags.map(t => (<span key={t} className="text-[10px] text-medieval-brightGold bg-medieval-stone/80 hover:bg-medieval-stone px-2.5 py-1 rounded border border-medieval-gold/20 hover:border-medieval-gold/40 shadow-sm transition-all">#{t}</span>))}</div>
              </div>
            )}
          </div>

          {linkedPhotos.length > 0 && (
            <div className="grimoire-card p-5 md:p-6 space-y-4 animate-fade-in">
              <h4 className="text-xs font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5 border-b border-medieval-gold/10 pb-2"><ImageIcon className="w-4 h-4" /><span>Fotos e Imagens Registradas ({linkedPhotos.length})</span></h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{linkedPhotos.map(photo => (<MemoryPhotoCard key={photo.id} photo={photo} onClick={() => setLightboxPhotoId(photo.id)} />))}</div>
            </div>
          )}

          {/* Collapsible Comments Section */}
          <div className="grimoire-card border border-medieval-gold/15 overflow-hidden">
            <div className="p-5 md:p-6 flex items-center justify-between cursor-pointer hover:bg-medieval-stone/10 transition-colors" onClick={() => setCommentsExpanded(!commentsExpanded)}>
              <h3 className="text-sm font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4" /><span>Comentários</span>
                <span className="text-[9px] bg-medieval-gold/15 border border-medieval-gold/25 text-medieval-gold rounded-full px-1.5 py-0.5 font-serif ml-1">{memory.comments?.length ?? 0}</span>
              </h3>
              <svg className={`w-5 h-5 text-medieval-gold/60 transition-transform duration-200 ${commentsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>

            {commentsExpanded && (
              <div className="p-5 md:p-6 space-y-4 border-t border-medieval-gold/10">
                {commentError && (<div className="p-3 bg-medieval-wine/20 border border-medieval-wine/50 rounded text-red-300 text-xs font-serif">{commentError}</div>)}

                <div className="grimoire-card p-4 space-y-3 border border-medieval-gold/20">
                  <h4 className="text-xs font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5"><MessageSquare className="w-3.5 h-3.5" /><span>{editingComment ? 'Editar Comentário' : 'Adicionar Comentário'}</span></h4>
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-medieval text-medieval-gold/80 uppercase tracking-wider">Comentário</label>
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Descreva o acontecimento, observação ou nota sobre esta memória..." rows={3} className="medieval-input resize-none py-1.5 text-xs" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-medieval text-medieval-gold/80 uppercase tracking-wider">Quem Comenta <span className="text-medieval-wine">*</span></label>
                      <select value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} className="medieval-input py-1.5 text-xs">
                        <option value="">— Selecione —</option><option value="Mestre">Mestre</option>
                        {allCharacters.filter(c => c.characterType !== 'ally').map(c => (<option key={c.id} value={c.name}>{c.name}</option>))}
                      </select>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-medieval text-medieval-gold/80 uppercase tracking-wider">Data do Registro</label>
                      <input type="date" value={commentDate} onChange={e => setCommentDate(e.target.value)} className="medieval-input py-1.5 text-xs" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button type="button" onClick={handleAddComment} className="btn-gold py-1.5 px-4 text-xs flex items-center space-x-1.5">{editingComment ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}<span>{editingComment ? 'Atualizar Comentário' : 'Gravar Comentário'}</span></button>
                    {editingComment && (<button type="button" onClick={handleCancelEditComment} className="btn-stone py-1.5 px-4 text-xs">Cancelar Edição</button>)}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none"><Search className="w-3.5 h-3.5 text-medieval-gold/50" /></div>
                  <input type="text" placeholder="Pesquisar comentários por palavra-chave..." value={commentFilterText} onChange={e => setCommentFilterText(e.target.value)} className="medieval-input w-full pl-8 pr-7 py-1 h-8 text-xs font-serif" />
                  {commentFilterText && (<button onClick={() => setCommentFilterText('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-medieval-silver/40 hover:text-medieval-wine transition-colors"><X className="w-3 h-3" /></button>)}
                </div>

                {filteredComments.length === 0 ? (
                  <div className="text-center py-6 text-xs text-medieval-silver/40 italic">{memory.comments?.length === 0 ? 'Nenhum comentário ainda. Use o formulário acima para adicionar o primeiro.' : 'Nenhum registro encontrado com os filtros atuais.'}</div>
                ) : (
                  <div className="space-y-3">
                    {visibleComments.map((cmt, idx) => (
                      <div key={cmt.id} className="relative pl-4 border-l-2 border-medieval-gold/20 hover:border-medieval-gold/50 transition-colors space-y-1 py-1 group" style={{ animationDelay: `${idx * 40}ms` }}>
                        <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-medieval-charcoal border border-medieval-gold/50" />
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-[9px] font-medieval text-medieval-gold bg-medieval-gold/10 border border-medieval-gold/20 px-1.5 py-0.5 rounded">{new Date(cmt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          {cmt.author && (<span className="text-[9px] font-medieval font-bold text-medieval-brightGold bg-medieval-gold/5 border border-medieval-gold/15 px-1.5 py-0.5 rounded">{cmt.author}</span>)}
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <button type="button" onClick={() => handleEditComment(cmt)} title="Editar comentário" className="p-0.5 rounded hover:bg-medieval-gold/20 text-medieval-gold hover:text-medieval-brightGold transition-colors"><Edit3 className="w-3 h-3" /></button>
                            <button type="button" onClick={() => setDeleteConfirmId(cmt.id)} title="Excluir comentário" className="p-0.5 rounded hover:bg-medieval-wine/30 text-medieval-wine/60 hover:text-medieval-wine transition-colors"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        {deleteConfirmId === cmt.id && (
                          <div className="mt-2 p-2 bg-medieval-wine/20 border border-medieval-wine/50 rounded flex items-center justify-between">
                            <span className="text-[10px] text-red-300">Tem certeza?</span>
                            <div className="flex items-center space-x-2">
                              <button type="button" onClick={() => handleDeleteComment(cmt.id)} className="text-[10px] bg-medieval-wine hover:bg-medieval-wine/80 text-white px-2 py-1 rounded transition-colors">Sim, excluir</button>
                              <button type="button" onClick={() => setDeleteConfirmId(null)} className="text-[10px] btn-stone px-2 py-1 rounded transition-colors">Cancelar</button>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-medieval-parchment/85 leading-relaxed whitespace-pre-line">{cmt.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {hasMoreComments && (
                  <div className="text-center pt-2">
                    <button type="button" onClick={() => setCommentVisibleCount(prev => prev + 5)} className="btn-stone py-1.5 px-4 text-[10px] text-medieval-gold hover:text-medieval-brightGold transition-colors">Carregar mais ({filteredComments.length - commentVisibleCount} restantes)</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medieval text-medieval-gold uppercase tracking-wider border-b border-medieval-gold/15 pb-2 flex items-center space-x-2"><Users className="w-4 h-4 text-medieval-gold" /><span>Heróis Presentes</span></h3>
          {participants === undefined ? <div className="text-center py-4 text-xs font-serif text-medieval-silver">Carregando heróis...</div> : participants.length === 0 ? (
            <div className="grimoire-card p-6 text-center text-xs text-medieval-silver italic">Nenhum herói registrado participou deste feito.</div>
          ) : (<div className="space-y-3">{participants.map((entry) => { const { character, levelReached } = entry; return (<ParticipantCard key={character.id} character={character} levelReached={levelReached} />); })}</div>)}
        </div>
      </div>

      {editModalOpen && (<MemoryModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} memoryToEdit={memory} />)}
      {lightboxPhotoId && (<PhotoLightbox photoId={lightboxPhotoId} onClose={() => setLightboxPhotoId(null)} />)}
    </div>
  );
};

const MemoryPhotoCard: React.FC<{ photo: Media; onClick: () => void }> = ({ photo, onClick }) => {
  const url = useMediaUrl(photo.id, true);
  return (<div onClick={onClick} className="grimoire-card grimoire-card-hover aspect-square overflow-hidden relative cursor-pointer group flex items-center justify-center bg-medieval-charcoal/50 border-medieval-gold/10">{url ? (<img src={url} alt={photo.filename} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />) : (<div className="text-[10px] text-medieval-silver">Lendo...</div>)}</div>);
};

const PhotoLightbox: React.FC<{ photoId: string; onClose: () => void }> = ({ photoId, onClose }) => {
  const url = useMediaUrl(photoId);
  return (<div className="fixed inset-0 z-50 bg-[#000000]/95 flex flex-col justify-center items-center p-4 animate-fade-in cursor-zoom-out" onClick={onClose}><button type="button" onClick={onClose} className="absolute top-4 right-4 text-medieval-silver hover:text-medieval-gold transition-colors p-2 cursor-pointer"><X className="w-8 h-8" /></button><div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>{url ? (<img src={url} alt="Registro Visual em Alta Resolução" className="max-w-full max-h-full object-contain rounded border border-medieval-gold/30 shadow-gold" />) : (<div className="text-medieval-gold animate-pulse text-sm font-medieval">Carregando imagem...</div>)}</div></div>);
};

const ParticipantCard: React.FC<{ character: Character; levelReached?: number }> = ({ character, levelReached }) => {
  const { navigate } = useRouter();
  const avatarUrl = useMediaUrl(character.imageId, true);
  return (<div onClick={() => navigate({ type: 'character-profile', id: character.id })} className="grimoire-card grimoire-card-hover p-3 flex items-center justify-between cursor-pointer">
    <div className="flex items-center space-x-3 min-w-0">
      <div className="w-10 h-10 rounded border border-medieval-gold/30 overflow-hidden flex-shrink-0 bg-medieval-charcoal flex items-center justify-center">{avatarUrl ? (<img src={avatarUrl} alt={character.name} className="w-full h-full object-cover" />) : (<div className="text-medieval-gold/50 text-sm font-medieval">{character.name.substring(0, 2).toUpperCase()}</div>)}</div>
      <div className="min-w-0">
        <h4 className="text-sm font-medieval font-bold text-medieval-brightGold truncate leading-none">{character.name}</h4>
        <span className="text-[10px] text-medieval-silver truncate block mt-1">Nível {character.level} • {character.class}</span>
      </div>
    </div>
    {levelReached && (<div className="flex flex-col items-end flex-shrink-0 pl-2"><span className="text-[9px] font-medieval font-black uppercase text-medieval-charcoal bg-medieval-gold px-2 py-0.5 rounded flex items-center leading-none"><ArrowUpRight className="w-2.5 h-2.5 text-medieval-charcoal mr-0.5" /><span>Nv {levelReached}</span></span><span className="text-[8px] font-serif text-medieval-gold mt-0.5 leading-none">Subiu de Nível!</span></div>)}
  </div>);
};