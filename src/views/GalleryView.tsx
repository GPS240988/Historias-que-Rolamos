import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useRouter } from '../contexts/RouterContext';
import { useCampaign } from '../contexts/CampaignContext';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { MediaService } from '../services/media';
import { GalleryImageModal } from '../components/gallery/GalleryImageModal';
import { TokenModal } from '../components/gallery/TokenModal';
import { ImageDetailModal } from '../components/gallery/ImageDetailModal';
import { TokenDetailModal } from '../components/gallery/TokenDetailModal';
import {
  Plus,
  Image as ImageIcon,
  Shield,
  Users,
  Eye,
  Trash2,
  ImagePlay,
  FileText,
  ChevronRight
} from 'lucide-react';
import type { Media, Token } from '../types';

interface GalleryViewProps {
  tab?: 'images' | 'files' | 'tokens';
}

// File List Item Component (for PDFs and attachments)
const FileListItem: React.FC<{ file: Media; onClick: () => void }> = ({ file, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="p-3 grimoire-card hover:bg-medieval-stone/30 transition-all duration-200 flex items-center justify-between cursor-pointer group"
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold group-hover:bg-medieval-gold/15 transition-all">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold truncate">
            {file.title || file.filename}
          </span>
          <span className="text-[10px] text-medieval-silver/50 block mt-0.5">
            {file.filename} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-200" />
    </div>
  );
};

export const GalleryView: React.FC<GalleryViewProps> = ({ tab = 'images' }) => {
  const { navigate } = useRouter();
  const { campaign } = useCampaign();

  // Modals state
  const [imageFormOpen, setImageFormOpen] = useState(false);
  const [tokenFormOpen, setTokenFormOpen] = useState(false);
  const [imageDetailOpen, setImageDetailOpen] = useState(false);
  const [tokenDetailOpen, setTokenDetailOpen] = useState(false);

  // Editing / details state
  const [selectedImage, setSelectedImage] = useState<Media | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  // Queries
  // Load all media and filter by isGallery flag client-side
  const allMedia = useLiveQuery(() => 
    campaign ? db.media.where('campaignId').equals(campaign.id).toArray() : []
  , [campaign?.id]) || [];

  // Gallery images: only files explicitly marked as isGallery=true
  const galleryImages = allMedia.filter(m => m.isGallery === true);

  // Files/Attachments: files marked as isGallery=false (PDFs, sheets, etc)
  const attachedFiles = allMedia.filter(m => m.isGallery === false);

  // Query all tokens (these are stored separately in tokens table)
  const allTokens = useLiveQuery(() => 
    campaign ? db.tokens.where('campaignId').equals(campaign.id).toArray() : []
  , [campaign?.id]) || [];

  const handleTabChange = (targetTab: 'images' | 'files' | 'tokens') => {
    navigate({ type: 'gallery', tab: targetTab });
  };

  // Delete handlers
  const handleImageDelete = async (mediaId: string) => {
    if (window.confirm('Excluir esta imagem da galeria? Isso apagará o arquivo físico.')) {
      try {
        await MediaService.deleteMedia(mediaId);
        setImageDetailOpen(false);
        setSelectedImage(null);
      } catch (err) {
        console.error('Erro ao deletar imagem:', err);
      }
    }
  };

  const handleTokenDelete = async (token: Token) => {
    if (window.confirm(`Deseja excluir o token "${token.name}"?`)) {
      try {
        await MediaService.deleteMedia(token.mediaId);
        await db.tokens.delete(token.id);
        setTokenDetailOpen(false);
        setSelectedToken(null);
      } catch (err) {
        console.error('Erro ao deletar token:', err);
      }
    }
  };

  const handleImageClick = (img: Media) => {
    setSelectedImage(img);
    setImageDetailOpen(true);
  };

  const handleTokenClick = (tok: Token) => {
    setSelectedToken(tok);
    setTokenDetailOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in font-serif">

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-medieval-gold/15 pb-4 space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-lg sm:text-xl font-medieval text-medieval-gold uppercase tracking-wider flex items-center space-x-2">
            <ImagePlay className="w-4 h-4 sm:w-5 sm:h-5 text-medieval-gold" />
            <span>Mural de Campanha</span>
          </h2>
          <p className="text-xs font-serif text-medieval-silver mt-1">
            Galeria visual de locais, inimigos, tokens de combate e heróis.
          </p>
        </div>

        {tab === 'images' ? (
          <button
            onClick={() => {
              setSelectedImage(null);
              setImageFormOpen(true);
            }}
            className="btn-gold py-1.5 px-3 text-xs flex items-center space-x-1.5 w-full sm:w-auto justify-center"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Arte</span>
          </button>
        ) : tab === 'tokens' ? (
          <button
            onClick={() => {
              setSelectedToken(null);
              setTokenFormOpen(true);
            }}
            className="btn-gold py-1.5 px-3 text-xs flex items-center space-x-1.5 w-full sm:w-auto justify-center"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Token</span>
          </button>
        ) : null}
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap gap-2 pb-2">
        <button
          onClick={() => handleTabChange('images')}
          className={`px-4 py-1.5 text-xs font-serif rounded transition-all duration-200 ${tab === 'images'
            ? 'bg-medieval-gold/15 border border-medieval-gold text-medieval-brightGold font-medium shadow-sm'
            : 'bg-medieval-stone/40 border border-medieval-gold/10 text-medieval-silver hover:bg-medieval-stone'
            }`}
        >
          Imagens da Campanha ({galleryImages.length})
        </button>
        <button
          onClick={() => handleTabChange('files')}
          className={`px-4 py-1.5 text-xs font-serif rounded transition-all duration-200 ${tab === 'files'
            ? 'bg-medieval-gold/15 border border-medieval-gold text-medieval-brightGold font-medium shadow-sm'
            : 'bg-medieval-stone/40 border border-medieval-gold/10 text-medieval-silver hover:bg-medieval-stone'
            }`}
        >
          Arquivos e Fichas ({attachedFiles.length})
        </button>
        <button
          onClick={() => handleTabChange('tokens')}
          className={`px-4 py-1.5 text-xs font-serif rounded transition-all duration-200 ${tab === 'tokens'
            ? 'bg-medieval-gold/15 border border-medieval-gold text-medieval-brightGold font-medium shadow-sm'
            : 'bg-medieval-stone/40 border border-medieval-gold/10 text-medieval-silver hover:bg-medieval-stone'
            }`}
        >
          Tokens de Combate ({allTokens.length})
        </button>
      </div>

      {/* Tab Panels */}
      {tab === 'images' ? (
        galleryImages.length === 0 ? (
          <div className="grimoire-card p-12 text-center text-medieval-silver max-w-lg mx-auto">
            A galeria está vazia. Comece carregando artes do cenário, mapas ou monstros!
            <button
              onClick={() => {
                setSelectedImage(null);
                setImageFormOpen(true);
              }}
              className="block mx-auto mt-6 btn-gold py-1.5 px-4 text-xs"
            >
              Adicionar Primeira Arte
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {galleryImages.map((img) => (
              <ImageGridCard
                key={img.id}
                image={img}
                onClick={() => handleImageClick(img)}
              />
            ))}
          </div>
        )
      ) : tab === 'files' ? (
        attachedFiles.length === 0 ? (
          <div className="grimoire-card p-12 text-center text-medieval-silver max-w-lg mx-auto">
            Nenhum arquivo anexado. Anexe fichas de personagem ou outros documentos.
          </div>
        ) : (
          <div className="space-y-2">
            {attachedFiles.map((file) => (
              <FileListItem
                key={file.id}
                file={file}
                onClick={() => handleImageClick(file)}
              />
            ))}
          </div>
        )
      ) : (
        allTokens.length === 0 ? (
          <div className="grimoire-card p-12 text-center text-medieval-silver max-w-lg mx-auto">
            Nenhum token de combate cadastrado. Crie tokens para referenciar inimigos, heróis e NPCs rápidos.
            <button
              onClick={() => {
                setSelectedToken(null);
                setTokenFormOpen(true);
              }}
              className="block mx-auto mt-6 btn-gold py-1.5 px-4 text-xs"
            >
              Criar Primeiro Token
            </button>
          </div>
        ) : (
          <TokenGrid tokens={allTokens} onTokenClick={handleTokenClick} />
        )
      )}


      {/* Upload/Edit Image Modal */}
      <GalleryImageModal
        isOpen={imageFormOpen}
        onClose={() => {
          setImageFormOpen(false);
          setSelectedImage(null);
        }}
        imageToEdit={selectedImage || undefined}
      />

      {/* Upload/Edit Token Modal */}
      <TokenModal
        isOpen={tokenFormOpen}
        onClose={() => {
          setTokenFormOpen(false);
          setSelectedToken(null);
        }}
        tokenToEdit={selectedToken || undefined}
      />

      {/* Image Detail Modal */}
      <ImageDetailModal
        isOpen={imageDetailOpen}
        onClose={() => {
          setImageDetailOpen(false);
          setSelectedImage(null);
        }}
        image={selectedImage}
        onEdit={() => {
          setImageDetailOpen(false);
          setImageFormOpen(true);
        }}
        onDelete={() => handleImageDelete(selectedImage!.id)}
      />

      {/* Token Detail Modal */}
      <TokenDetailModal
        isOpen={tokenDetailOpen}
        onClose={() => {
          setTokenDetailOpen(false);
          setSelectedToken(null);
        }}
        token={selectedToken}
        onEdit={() => {
          setTokenDetailOpen(false);
          setTokenFormOpen(true);
        }}
        onDelete={() => handleTokenDelete(selectedToken!)}
      />

    </div>
  );
};

// Image Grid Card Component
const ImageGridCard: React.FC<{ image: Media; onClick: () => void }> = ({ image, onClick }) => {
  const thumbnailUrl = useMediaUrl(image.id, true);

  return (
    <div
      onClick={onClick}
      className="grimoire-card grimoire-card-hover aspect-square cursor-pointer overflow-hidden relative group"
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={image.title || image.filename}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-medieval-charcoal/50 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-medieval-gold/30" />
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-medieval-charcoal/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
        <span className="text-[10px] text-medieval-gold tracking-wider font-medieval font-semibold">
          {image.isGallery ? 'Arte' : 'Anexo'}
        </span>
        <div>
          <h4 className="text-xs font-medieval font-bold text-medieval-brightGold truncate leading-none mb-1">
            {image.title || image.filename.split('.')[0]}
          </h4>
          <span className="text-[8px] text-medieval-silver/85 font-serif flex items-center">
            <Eye className="w-3 h-3 mr-0.5 inline" /> Inspecionar
          </span>
        </div>
      </div>
    </div>
  );
};

// Token List Grid Component
interface TokenGridProps {
  tokens: Token[];
  onTokenClick: (token: Token) => void;
}

const TokenGrid: React.FC<TokenGridProps> = ({ tokens, onTokenClick }) => {
  // Group tokens by Category
  const pcTokens = tokens.filter(t => t.category === 'Player Character');
  const npcTokens = tokens.filter(t => t.category === 'NPC');
  const enemyTokens = tokens.filter(t => t.category === 'Enemy');

  return (
    <div className="space-y-8 font-serif">
      {/* PCs */}
      {pcTokens.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-md font-medieval text-medieval-gold border-b border-medieval-gold/15 pb-1 uppercase tracking-wider flex items-center space-x-1.5">
            <Shield className="w-4 h-4" />
            <span>Heróis (PCs)</span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {pcTokens.map(tok => (
              <TokenCard key={tok.id} token={tok} onClick={() => onTokenClick(tok)} />
            ))}
          </div>
        </div>
      )}

      {/* NPCs */}
      {npcTokens.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-md font-medieval text-medieval-gold border-b border-medieval-gold/15 pb-1 uppercase tracking-wider flex items-center space-x-1.5">
            <Users className="w-4 h-4" />
            <span>Aliados e NPCs</span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {npcTokens.map(tok => (
              <TokenCard key={tok.id} token={tok} onClick={() => onTokenClick(tok)} />
            ))}
          </div>
        </div>
      )}

      {/* Enemies */}
      {enemyTokens.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-md font-medieval text-medieval-gold border-b border-medieval-gold/15 pb-1 uppercase tracking-wider flex items-center space-x-1.5">
            <Trash2 className="w-4 h-4" />
            <span>Ameaças e Monstros</span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {enemyTokens.map(tok => (
              <TokenCard key={tok.id} token={tok} onClick={() => onTokenClick(tok)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Token Avatar Card Component
const TokenCard: React.FC<{ token: Token; onClick: () => void }> = ({ token, onClick }) => {
  const tokenUrl = useMediaUrl(token.mediaId, true); // Load thumbnail for quick render

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center space-y-2 cursor-pointer group"
    >
      {/* Circle Frame */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-medieval-gold/30 p-0.5 bg-medieval-stone hover:border-medieval-gold hover:shadow-gold transition-all duration-300 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105">
        <div className="w-full h-full rounded-full overflow-hidden bg-medieval-charcoal/60">
          {tokenUrl ? (
            <img src={tokenUrl} alt={token.name} className="w-full h-full object-cover rounded-full" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-medieval-gold/25 font-medieval text-xs">
              TOK
            </div>
          )}
        </div>
      </div>
      <span className="text-[11px] font-semibold text-medieval-silver text-center truncate max-w-full font-serif leading-none mt-1 group-hover:text-medieval-brightGold">
        {token.name}
      </span>
    </div>
  );
};
