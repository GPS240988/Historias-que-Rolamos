import { db } from './index';
import type { Memory, MemoryType } from '../types';

export async function seedCampaignMemories(campaignId: string) {
  // Clear any existing seeded memories first to avoid duplicates when re-seeding
  const existingMemories = await db.memories.where('campaignId').equals(campaignId).toArray();
  for (const mem of existingMemories) {
    if (mem.id.startsWith('c8b6a12b-3652-')) {
      await db.memories.delete(mem.id);
      const relations = await db.memoryCharacters.where('memoryId').equals(mem.id).toArray();
      for (const rel of relations) {
        await db.memoryCharacters.delete(rel.id);
      }
    }
  }

  // Base date starting 120 days ago, incrementing for each part
  const baseDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);

  const getSeededDate = (index: number) => {
    const d = new Date(baseDate.getTime() + index * 5 * 24 * 60 * 60 * 1000); // 5 days apart
    return d.toISOString().substring(0, 10);
  };

  const seedMemories: {
    id: string;
    title: string;
    type: MemoryType;
    tags: string[];
    description: string;
    descriptionRhodgar: string;
    descriptionErnest: string;
  }[] = [
    // Aventura 1: Forja de Heróis
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1001',
      title: 'Aventura 1 - Parte 1: Vida de Aventureiro',
      type: 'Interpretação',
      tags: ['Yuvalin', 'Exame', 'Guilda', 'Ratos-Gigantes', 'Nível 1'],
      description: 'A campanha inicia no grande salão da Sede da Guilda dos Mineradores, no Distrito da Forja em Yuvalin. Os aventureiros iniciantes buscam obter suas licenças anuais no Exame de Admissão. Apenas membros registrados podem exercer a profissão na cidade. Para o teste inicial, o Conselheiro Ezequias Heldret delega uma tarefa aparentemente simples: livrar os porões da Guilda de uma infestação de ratos gigantes e outras pragas. Contudo, ao investigarem, os personagens enfrentam criaturas estranhamente alteradas e agressivas, sugerindo uma ameaça mais profunda sob o Distrito da Forja.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1002',
      title: 'Aventura 1 - Parte 2: Trabalho Duro',
      type: 'Exploração',
      tags: ['Mural-de-Tarefas', 'Contrabando', 'Curtumes', 'Intriga', 'Nível 2'],
      description: 'Agora oficialmente licenciados como esquadrão de nível Quartzo, os heróis começam a realizar trabalhos postados no mural da sede. Eles assumem a missão de investigar contrabandistas operando no Distrito dos Curtumes. O caso envolve pistas que apontam para desvios de minérios valiosos e mercadorias sob proteção. Durante as investigações, os aventureiros conhecem Peter Varhim, o problemático filho do presidente do conselho da Guilda, estabelecendo laços e desvendando segredos de família.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1003',
      title: 'Aventura 1 - Parte 3: Grandes Poderes',
      type: 'Conquista',
      tags: ['Julgamento', 'Rodford', 'Conspiração', 'Yuvalin', 'Nível 3'],
      description: 'Com prestígio acumulado e promovidos ao nível Topázio, os heróis se deparam com a conspiração liderada por Rodford Varhim, que usa a Guilda para benefício próprio e pactua com remanescentes puristas. Com a ajuda de Ezequias, o grupo reúne provas e testemunhas (como Goro Okazaki e o filho de Rodford) para apresentar perante o Conselho de Yuvalin. Em um julgamento tenso no tribunal da cidade, a argumentação e as evidências prevalecem, resultando na condenação de Rodford e na ascensão de Ezequias Heldret como presidente da Guilda.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    // Aventura 2: O Segredo das Minas
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1004',
      title: 'Aventura 2 - Parte 1: Os Mineradores Perdidos',
      type: 'Exploração',
      tags: ['Mina-Heldret', 'Subsolo', 'Elevador', 'Resgate', 'Nível 4'],
      description: 'Após a pacificação de Yuvalin, Ezequias Heldret solicita a ajuda dos heróis para explorar as profundezas de suas minas particulares, onde uma antiga câmara anã foi descoberta durante escavações de aço-rubi. Ao chegarem na entrada, os heróis deparam-se com o bando de Zelin, capangas remanescentes da antiga liderança de Rodford, tentando saquear o local. Após o combate, reativam um antigo elevador que dá acesso ao primeiro andar da câmara subterrânea, iniciando as buscas por mineradores desaparecidos.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1005',
      title: 'Aventura 2 - Parte 2: Sede de Vingança',
      type: 'Batalha',
      tags: ['Kobolds', 'Subterrâneo', 'Resgate', 'Nível 5'],
      description: 'Ao descerem para a câmara anã, os aventureiros descobrem que o segundo andar está tomado por uma infestação agressiva de Kobolds liderados por uma figura fanática. A exploração revela que os mineradores perdidos foram capturados e usados como mão de obra escrava para escavar minério sob condições deploráveis. Os heróis infiltram-se nos ninhos subterrâneos e enfrentam as hordas para libertar os reféns.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1006',
      title: 'Aventura 2 - Parte 3: As Sobras da Guerra',
      type: 'Batalha',
      tags: ['Golem', 'Engenharia', 'Runas', 'Zakharov', 'Nível 6'],
      description: 'A descida para o terceiro andar da antiga câmara anã revela um laboratório abandonado de engenharia de combate da antiga guerra. Um Golem de Defesa colossal foi reativado por acidente, atacando qualquer intruso. O esquadrão precisa decifrar as runas anãs de contenção no painel central enquanto desvia dos ataques devastadores da máquina para desativá-la ou destruí-la.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1007',
      title: 'Aventura 2 - Parte 4: Os Segredos de Tallaka',
      type: 'Conquista',
      tags: ['Forja', 'Aço-Rubi', 'Artefato', 'Yuvalin', 'Nível 7'],
      description: 'O último andar da câmara abriga a lendária forja de Tallaka. Lá, os personagens encontram o artefato capaz de refinar e moldar o aço-rubi. No entanto, o bando de puristas remanescentes e uma criatura planar convocada protegem o santuário. A vitória garante o controle da forja e a matéria-prima necessária para as armas especiais que serão usadas contra a Tormenta.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    // Aventura 3: O Forte de Ferro
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1008',
      title: 'Aventura 3 - Parte 1: Mão de Kobold',
      type: 'Exploração',
      tags: ['Aslavi', 'Defesa', 'Invasão', 'Rebeldes', 'Nível 8'],
      description: 'Aventura Três inicia com a caravana dos heróis partindo de Yuvalin em direção à fronteira do reino. Para cruzar o território em segurança, eles precisam entrar em Aslavi, uma cidade fortificada. No entanto, a região está sob ataque constante de hordas rebeldes de Kobolds e monstros terrestres sob o comando de um líder misterioso conhecido como "Mão de Kobold". O esquadrão ajuda na defesa dos muros e investiga a origem dos ataques.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1009',
      title: 'Aventura 3 - Parte 2: Castelo de Barro',
      type: 'Exploração',
      tags: ['Forte-Inimigo', 'Infiltração', 'Furtivo', 'Florestas', 'Nível 9'],
      description: 'Para parar a ameaça a Aslavi, os personagens localizam e planejam uma invasão ao "Castelo de Barro", a fortaleza improvisada do bando rebelde de kobolds e mercenários na floresta densa. A infiltração requer táticas furtivas, desarmar armadilhas de fumaça e combater os guardas puristas que usam o local como fachada para operações secretas.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1010',
      title: 'Aventura 3 - Parte 3: Valha-me Nimb',
      type: 'Conquista',
      tags: ['Nimb', 'Desfiladeiro', 'Entropia', 'Caos', 'Nível 10'],
      description: 'A perseguição aos líderes da conspiração leva o grupo a um desfiladeiro instável sob a influência caótica de Nimb, o deus da sorte e do azar. O clima muda de forma imprevisível e efeitos mágicos aleatórios alteram as leis da física durante o combate final contra a elite da Supremacia Purista. A vitória estabiliza a rota de comércio e revela o plano mestre dos vilões.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    // Aventura 4: A Dama de Vidro
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1011',
      title: 'Aventura 4 - Parte 1: Amigos de Alta Estirpe',
      type: 'Interpretação',
      tags: ['Vectora', 'Vectorius', 'Nuvens', 'Mercadores', 'Nível 11'],
      description: 'Aventura Quatro começa em Vectora, o Mercado nas Nuvens — a imensa rocha flutuante que abriga uma cidade de bazares e torres espiraladas. Os heróis surgem na praça da estátua do arquimago Vectorius com o objetivo de obter audiência com figuras influentes e mercadores de alta estirpe para financiar e obter informações sobre o Parvathar, o dispositivo necessário para selar a Tormenta.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1012',
      title: 'Aventura 4 - Parte 2: Pântano, Pudim e Piratas',
      type: 'Exploração',
      tags: ['Pântano-dos-Vermes', 'Salistick', 'Pudim-Negro', 'Ácido', 'Nível 12'],
      description: 'O grupo desce em Yuton, capital de Salistick, e segue para o temido Pântano dos Vermes em busca de um catalisador elemental de ácido necessário para carregar o Parvathar. A região pantanosa é habitada por piratas de pântano e geleias ácidas gigantes (pudins negros). Os aventureiros precisam desbravar as águas tóxicas e desmantelar a base pirata.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1013',
      title: 'Aventura 4 - Parte 3: A Chama do Rei',
      type: 'Exploração',
      tags: ['Sckharshantallas', 'Vulcão', 'Lava', 'Draquianos', 'Nível 13'],
      description: 'A próxima parada leva os heróis a Sckharshantallas em busca do catalisador de fogo puro. Como voar com nuvens místicas no território do Dragão-Rei Sckhar é considerado suicídio, os heróis infiltram-se por terra no feudo vulcânico para coletar a chama primordial no coração das caldeiras de lava, desviando das patrulhas draconianas.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1014',
      title: 'Aventura 4 - Parte 4: Enterrem meu Coração nas Uivantes',
      type: 'Conquista',
      tags: ['Uivantes', 'Beluhga', 'Gelo', 'Gigantes', 'Nível 14'],
      description: 'O último catalisador elemental do gelo está no topo das Montanhas Uivantes, no antigo santuário da Dragoa-Rainha Beluhga. Os heróis escalam a cordilheira sob um frio extremo e enfrentam nevascas mortais e predadores de gelo. No santuário, desvendam os mistérios ancestrais do local para carregar o último slot do Parvathar.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    // Aventura 5: O Coração de Rubi
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1015',
      title: 'Aventura 5 - Parte 1: Os Céus de Yuvalin',
      type: 'Batalha',
      tags: ['Defesa-Aérea', 'Frota', 'Bombardeio', 'Puristas', 'Nível 15'],
      description: 'Aventura Cinco começa com a Supremacia Purista atacando Yuvalin com sua frota aérea militar para retomar o controle da cidade-forja. Os heróis lideram as milícias de Yuvalin e coordenam a resistência urbana contra a primeira onda de bombardeios puristas e tropas de assalto.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1016',
      title: 'Aventura 5 - Parte 2: Salto sobre Yuvalin',
      type: 'Batalha',
      tags: ['Aeronaves', 'Sabotagem', 'Dracocérbera', 'Conveses', 'Nível 16'],
      description: 'Para destruir a frota inimiga, os personagens infiltram-se nas naves de comando puristas que sobrevoam Yuvalin. Eles combatem a tripulação a bordo da "Hidra Helicoide" e da colossal "Diligência Dracocérbera", sabotando seus reatores internos de elementais de eletricidade e forçando a queda da frota.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1017',
      title: 'Aventura 5 - Parte 3: A.R.Q.U.E.M.I.S.',
      type: 'Conquista',
      tags: ['Super-Arma', 'Reator', 'Contagem', 'Infiltração', 'Nível 17'],
      description: 'A sacerdotisa conclama os aventureiros a bordo do navio "Mariposa". Ela revela que os puristas recusam-se a render-se e pretendem disparar a super-arma móvel A.R.Q.U.E.M.I.S. contra Yuvalin. O grupo realiza uma missão desesperada nas caldeiras da super-arma purista para desativá-la antes do disparo final.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    // Aventura 6: O Fim dos Tempos
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1018',
      title: 'Aventura 6 - Parte 1: Mais Perto do Sonho',
      type: 'Interpretação',
      tags: ['Expedição', 'Aço-Rubi', 'Trajes', 'Yuvalin', 'Nível 18'],
      description: 'Com a frota purista destruída, o clima em Yuvalin é de otimismo e os heróis são tratados como celebridades. Ezequias organiza a expedição final para a Área de Tormenta de Zakharov com o Parvathar carregado. O grupo ajuda a inspecionar os trajes de proteção de aço-rubi e a treinar o esquadrão de elite.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1019',
      title: 'Aventura 6 - Parte 2: Dia Vermelho',
      type: 'Exploração',
      tags: ['Tormenta', 'Zakharov', 'Nuvens-Vermelhas', 'Feras', 'Nível 19'],
      description: 'A expedição chega à fronteira da Área de Tormenta de Zakharov. Sob um céu de nuvens vermelhas e chuva ácida de matéria vermelha, os aventureiros desbravam o terreno alienígena. Eles enfrentam monstros lefeu colossais e salvam membros da caravana que são atacados durante a travessia.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    },
    {
      id: 'c8b6a12b-3652-47ef-a0c5-a6e546da1020',
      title: 'Aventura 6 - Parte 3: Fora da Realidade',
      type: 'Conquista',
      tags: ['Aharadak', 'Cardeal', 'Parvathar', 'Fenda', 'Nível 20'],
      description: 'O grupo alcança o Santuário da Tormenta — um palácio de placas metálicas vermelhas pulsantes e tecido orgânico. Guiados pelo Emissário, os heróis penetram no núcleo para enfrentar os Cardeais da Tormenta e ativar o Parvathar para selar a tempestade planar de Zakharov de uma vez por todas.',
      descriptionRhodgar: '',
      descriptionErnest: ''
    }
  ];

  // Try to bind seeded characters to these memories if they exist
  const chars = await db.characters.toArray();
  const rhodgar = chars.find(c => c.name.toLowerCase().includes('rhodgar'));
  const ernest = chars.find(c => c.name.toLowerCase().includes('ernest'));
  const activeCharIds = [rhodgar, ernest].filter(Boolean).map(c => c!.id);

  for (let i = 0; i < seedMemories.length; i++) {
    const data = seedMemories[i];
    const mem: Memory = {
      id: data.id,
      campaignId,
      title: data.title,
      eventDate: getSeededDate(i),
      type: data.type,
      tags: data.tags,
      description: data.description,
      descriptionRhodgar: data.descriptionRhodgar,
      descriptionErnest: data.descriptionErnest,
      characterIds: activeCharIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.memories.put(mem);

    // Seed relationship links
    for (const charId of activeCharIds) {
      const relId = `${mem.id}_${charId}`;
      await db.memoryCharacters.put({
        id: relId,
        memoryId: mem.id,
        characterId: charId
      });
    }
  }
}
