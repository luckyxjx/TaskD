import { useEffect, useState } from 'react';
import { Search, User, ArrowLeft, Plus, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ShareBoardModal } from '../components/ShareBoardModal';
import { CardComments } from '../components/CardComments';
import { ActivityFeed } from '../components/ActivityFeed';
import { ShareIcon, ActivityIcon, LogOutIcon } from '../icons';

interface List {
  id: string;
  name: string;
  position: number;
}

interface Card {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  position: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface BoardProps {
  boardId: string;
  onBack: () => void;
  onProfileClick: () => void;
}

export function Board({ boardId, onBack, onProfileClick }: BoardProps) {
  const [boardName, setBoardName] = useState('');
  const [lists, setLists] = useState<List[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [draggedList, setDraggedList] = useState<List | null>(null);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [showRenameBoardModal, setShowRenameBoardModal] = useState(false);
  const [showDeleteBoardModal, setShowDeleteBoardModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardDescription, setNewCardDescription] = useState('');
  const [newCardPriority, setNewCardPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [cardModalTitle, setCardModalTitle] = useState('');
  const [cardModalDescription, setCardModalDescription] = useState('');
  const [cardModalPriority, setCardModalPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [renameBoardName, setRenameBoardName] = useState('');
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Check if current user is board owner
  useEffect(() => {
    const checkOwnership = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', boardId)
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setIsOwner(data.role === 'owner');
      }
    };
    checkOwnership();
  }, [boardId]);

  useEffect(() => {
    loadBoardData();

    // Subscribe to real-time changes for lists
    const listsSubscription = supabase
      .channel(`lists:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `board_id=eq.${boardId}`
        },
        (payload) => {
          console.log('List change detected:', payload);
          loadBoardData();
        }
      )
      .subscribe();

    // Subscribe to real-time changes for cards
    const cardsSubscription = supabase
      .channel(`cards:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards'
        },
        (payload) => {
          console.log('Card change detected:', payload);
          loadBoardData();
        }
      )
      .subscribe();

    // Subscribe to board changes (for name updates)
    const boardSubscription = supabase
      .channel(`board:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'boards',
          filter: `id=eq.${boardId}`
        },
        (payload) => {
          console.log('Board change detected:', payload);
          if (payload.new && 'name' in payload.new) {
            setBoardName(payload.new.name as string);
          }
        }
      )
      .subscribe();

    return () => {
      listsSubscription.unsubscribe();
      cardsSubscription.unsubscribe();
      boardSubscription.unsubscribe();
    };
  }, [boardId]);

  const loadBoardData = async () => {
    const { data: boardData } = await supabase
      .from('boards')
      .select('name')
      .eq('id', boardId)
      .single();

    if (boardData) {
      setBoardName(boardData.name);
    }

    const { data: listsData } = await supabase
      .from('lists')
      .select('*')
      .eq('board_id', boardId)
      .order('position');

    setLists(listsData || []);

    // Guard: Only query cards if we have lists
    if (!listsData || listsData.length === 0) {
      setCards([]);
      return;
    }

    const { data: cardsData } = await supabase
      .from('cards')
      .select('*')
      .in(
        'list_id',
        listsData.map((l) => l.id)
      )
      .order('position');

    setCards(cardsData || []);
  };

  const createList = async () => {
    if (!newListName.trim()) return;

    const maxPosition = lists.reduce((max, list) => Math.max(max, list.position), -1);

    const { data, error } = await supabase
      .from('lists')
      .insert([{ name: newListName, board_id: boardId, position: maxPosition + 1 }])
      .select()
      .single();

    if (error) {
      console.error('Error creating list:', error);
      return;
    }

    if (data) {
      setLists([...lists, data]);
      setNewListName('');
      setShowNewListModal(false);

      // Log activity
      await supabase.from('activities').insert([{
        board_id: boardId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'created',
        entity_type: 'list',
        entity_id: data.id,
        metadata: { name: data.name }
      }]);
    }
  };

  const renameBoard = async () => {
    if (!renameBoardName.trim()) return;

    const { error } = await supabase
      .from('boards')
      .update({ name: renameBoardName })
      .eq('id', boardId);

    if (error) {
      console.error('Error renaming board:', error);
      return;
    }

    setBoardName(renameBoardName);
    setShowRenameBoardModal(false);
    setRenameBoardName('');
    setShowBoardMenu(false);
  };

  const deleteBoard = async () => {
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (error) {
      console.error('Error deleting board:', error);
      return;
    }

    onBack(); // Go back to dashboard after deleting
  };

  const createCard = async () => {
    if (!newCardTitle.trim() || !selectedListId) return;

    const listCards = cards.filter((c) => c.list_id === selectedListId);
    const maxPosition = listCards.reduce((max, card) => Math.max(max, card.position), -1);

    const { data, error } = await supabase
      .from('cards')
      .insert([{
        title: newCardTitle,
        description: newCardDescription || null,
        list_id: selectedListId,
        position: maxPosition + 1,
        priority: newCardPriority,
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        alert('A card with this title already exists in this list!');
      } else {
        console.error('Error creating card:', error);
        alert('Failed to create card. Please try again.');
      }
      return;
    }

    if (data) {
      setCards([...cards, data]);
      setNewCardTitle('');
      setNewCardDescription('');
      setNewCardPriority('medium');
      setShowNewCardModal(false);
      setSelectedListId(null);

      // Log activity
      await supabase.from('activities').insert([{
        board_id: boardId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'created',
        entity_type: 'card',
        entity_id: data.id,
        metadata: { title: data.title }
      }]);
    }
  };

  const updateCard = async () => {
    if (!selectedCard) return;

    const { error } = await supabase
      .from('cards')
      .update({
        title: cardModalTitle,
        description: cardModalDescription,
        priority: cardModalPriority,
      })
      .eq('id', selectedCard.id);

    if (error) {
      console.error('Error updating card:', error);
      return;
    }

    setCards(
      cards.map((c) =>
        c.id === selectedCard.id
          ? { ...c, title: cardModalTitle, description: cardModalDescription, priority: cardModalPriority }
          : c
      )
    );
    setShowCardModal(false);
    setSelectedCard(null);

    // Log activity
    await supabase.from('activities').insert([{
      board_id: boardId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'updated',
      entity_type: 'card',
      entity_id: selectedCard.id,
      metadata: { title: cardModalTitle }
    }]);
  };

  const deleteCard = async () => {
    if (!selectedCard) return;

    const { error } = await supabase.from('cards').delete().eq('id', selectedCard.id);

    if (error) {
      console.error('Error deleting card:', error);
      return;
    }

    setCards(cards.filter((c) => c.id !== selectedCard.id));
    
    // Log activity
    await supabase.from('activities').insert([{
      board_id: boardId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'deleted',
      entity_type: 'card',
      entity_id: selectedCard.id,
      metadata: { title: selectedCard.title }
    }]);

    setShowCardModal(false);
    setSelectedCard(null);
  };

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    e.stopPropagation(); // Prevent event from bubbling to list
    setDraggedCard(card);
    setDraggedList(null); // Clear any list drag state
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetListId: string) => {
    e.stopPropagation(); // Prevent event from bubbling to list
    
    if (!draggedCard || draggedCard.list_id === targetListId) {
      setDraggedCard(null);
      return;
    }

    const targetListCards = cards.filter((c) => c.list_id === targetListId);
    const maxPosition = targetListCards.reduce((max, card) => Math.max(max, card.position), -1);

    const { error } = await supabase
      .from('cards')
      .update({ list_id: targetListId, position: maxPosition + 1 })
      .eq('id', draggedCard.id);

    if (error) {
      console.error('Error moving card:', error);
      setDraggedCard(null);
      return;
    }

    // Get list names for activity log
    const fromList = lists.find(l => l.id === draggedCard.list_id);
    const toList = lists.find(l => l.id === targetListId);

    // Log activity
    await supabase.from('activities').insert([{
      board_id: boardId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: 'moved',
      entity_type: 'card',
      entity_id: draggedCard.id,
      metadata: { 
        title: draggedCard.title,
        from_list: fromList?.name,
        to_list: toList?.name
      }
    }]);

    setCards(
      cards.map((c) =>
        c.id === draggedCard.id ? { ...c, list_id: targetListId, position: maxPosition + 1 } : c
      )
    );
    setDraggedCard(null);
  };

  const handleListDragStart = (e: React.DragEvent, list: List) => {
    e.stopPropagation(); // Prevent interference with card drag
    setDraggedList(list);
    setDraggedCard(null); // Clear any card drag state
  };

  const handleListDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleListDrop = async (e: React.DragEvent, targetList: List) => {
    e.stopPropagation(); // Prevent interference with card drop
    
    if (!draggedList || draggedList.id === targetList.id) {
      setDraggedList(null);
      return;
    }

    const sourcePosition = draggedList.position;
    const targetPosition = targetList.position;

    // Update positions
    const updatedLists = lists.map((list) => {
      if (list.id === draggedList.id) {
        return { ...list, position: targetPosition };
      }
      if (sourcePosition < targetPosition) {
        if (list.position > sourcePosition && list.position <= targetPosition) {
          return { ...list, position: list.position - 1 };
        }
      } else {
        if (list.position >= targetPosition && list.position < sourcePosition) {
          return { ...list, position: list.position + 1 };
        }
      }
      return list;
    });

    setLists(updatedLists.sort((a, b) => a.position - b.position));

    // Update in database
    for (const list of updatedLists) {
      await supabase
        .from('lists')
        .update({ position: list.position })
        .eq('id', list.id);
    }

    setDraggedList(null);
  };

  const deleteList = async (listId: string) => {
    const listToDelete = lists.find(l => l.id === listId);
    
    const { error } = await supabase.from('lists').delete().eq('id', listId);

    if (error) {
      console.error('Error deleting list:', error);
      return;
    }

    setLists(lists.filter((l) => l.id !== listId));
    setCards(cards.filter((c) => c.list_id !== listId));
    setShowListMenu(null);

    // Log activity
    if (listToDelete) {
      await supabase.from('activities').insert([{
        board_id: boardId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'deleted',
        entity_type: 'list',
        entity_id: listId,
        metadata: { name: listToDelete.name }
      }]);
    }
  };

  const openCardModal = (card: Card) => {
    setSelectedCard(card);
    setCardModalTitle(card.title);
    setCardModalDescription(card.description || '');
    setCardModalPriority(card.priority || 'medium');
    setShowCardModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-danger-100 text-danger-700 border-danger-200 dark:bg-danger-900/30 dark:text-danger-400 dark:border-danger-700';
      case 'high':
        return 'bg-warning-100 text-warning-700 border-warning-200 dark:bg-warning-900/30 dark:text-warning-400 dark:border-warning-700';
      case 'medium':
        return 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-700';
      case 'low':
        return 'bg-success-100 text-success-700 border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getListCards = (listId: string) => {
    return cards
      .filter((card) => card.list_id === listId)
      .filter((card) => card.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.position - b.position);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <div className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-semibold">Back to Dashboard</span>
          </button>
          <button
            onClick={onProfileClick}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <User className="w-6 h-6" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {boardName}
            </h1>
            <div className="flex items-center gap-2">
              {/* Share Button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-all duration-200"
                title="Share board"
              >
                <ShareIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Share</span>
              </button>

              {/* Activity Feed Button */}
              <button
                onClick={() => setShowActivityFeed(!showActivityFeed)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 hover:bg-accent-200 dark:hover:bg-accent-900/50 transition-all duration-200"
                title="Activity feed"
              >
                <ActivityIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Activity</span>
              </button>
              
              {/* Settings Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowBoardMenu(!showBoardMenu)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
                  title="Board settings"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showBoardMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                    {isOwner ? (
                      <>
                        <button
                          onClick={() => {
                            setRenameBoardName(boardName);
                            setShowRenameBoardModal(true);
                            setShowBoardMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                          Rename Board
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteBoardModal(true);
                            setShowBoardMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Board
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;

                          if (!confirm('Are you sure you want to leave this board?')) return;

                          const { error } = await supabase
                            .from('board_members')
                            .delete()
                            .eq('board_id', boardId)
                            .eq('user_id', user.id);

                          if (error) {
                            alert('Failed to leave board');
                            return;
                          }

                          alert('You have left the board');
                          onBack();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                      >
                        <LogOutIcon className="w-4 h-4" />
                        Leave Board
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white/70 dark:bg-gray-800/70 border border-white/20 dark:border-gray-700/30 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none backdrop-blur-sm transition-all duration-200 w-64 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-6 custom-scrollbar">
        <div className="flex gap-4 h-full">
          {/* Lists Container */}
          <div className="flex gap-4 min-w-max pb-4 flex-1">
          {lists.map((list, index) => (
            <div
              key={list.id}
              draggable
              onDragStart={(e) => handleListDragStart(e, list)}
              onDragOver={handleListDragOver}
              onDrop={(e) => handleListDrop(e, list)}
              className="glass rounded-2xl p-4 w-80 flex flex-col flex-shrink-0 animate-fade-in-up bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-move"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{list.name}</h3>
                <div className="relative">
                  <button 
                    onClick={() => setShowListMenu(showListMenu === list.id ? null : list.id)}
                    className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-all"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  {showListMenu === list.id && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                      <button
                        onClick={() => {
                          if (confirm(`Delete list "${list.name}" and all its cards?`)) {
                            deleteList(list.id);
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete List
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div 
                className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, list.id)}
              >
                {getListCards(list.id).map((card, cardIndex) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card)}
                    onClick={() => openCardModal(card)}
                    className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group animate-fade-in"
                    style={{ animationDelay: `${cardIndex * 30}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-gray-900 dark:text-gray-100 font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex-1">
                        {card.title}
                      </p>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(card.priority || 'medium')} whitespace-nowrap`}>
                        {getPriorityLabel(card.priority || 'medium')}
                      </span>
                    </div>
                    {card.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                        {card.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setSelectedListId(list.id);
                  setShowNewCardModal(true);
                }}
                className="mt-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white/50 dark:hover:bg-gray-800/50 px-3 py-2 rounded-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-semibold">Add card</span>
              </button>
            </div>
          ))}

          <button
            onClick={() => setShowNewListModal(true)}
            className="glass hover:bg-white/80 dark:hover:bg-gray-800/80 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 rounded-2xl p-6 w-80 flex flex-col items-center justify-center gap-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 flex-shrink-0 min-h-[200px] group bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Plus className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="font-semibold">Add list</span>
          </button>
          </div>

          {/* Activity Feed Sidebar */}
          {/* Activity Feed Slide-over */}
          {showActivityFeed && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
                onClick={() => setShowActivityFeed(false)}
              />
              
              {/* Slide-over Panel */}
              <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-hidden flex flex-col" style={{ animation: 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <ActivityIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Activity</h2>
                  </div>
                  <button
                    onClick={() => setShowActivityFeed(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Activity Feed Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  <ActivityFeed boardId={boardId} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showNewListModal}
        onClose={() => setShowNewListModal(false)}
        title="Create List"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="List Name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="e.g., To Do, In Progress, Done"
            onKeyDown={(e) => e.key === 'Enter' && createList()}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => setShowNewListModal(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={createList} variant="primary">
              Create List
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showNewCardModal}
        onClose={() => {
          setShowNewCardModal(false);
          setSelectedListId(null);
          setNewCardDescription('');
        }}
        title="Create Card"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Card Title"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={newCardDescription}
              onChange={(e) => setNewCardDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100"
              placeholder="Add more details..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setNewCardPriority(priority)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                    newCardPriority === priority
                      ? getPriorityColor(priority) + ' scale-105'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {getPriorityLabel(priority)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setShowNewCardModal(false);
                setSelectedListId(null);
                setNewCardDescription('');
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={createCard} variant="primary">
              Create Card
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        title="Card Details"
        size="xl"
      >
        <div className="flex gap-6 max-h-[70vh]">
          {/* Left Column - Card Details */}
          <div className="flex-1 space-y-5 overflow-y-auto custom-scrollbar pr-2">
            <Input
              label="Title"
              value={cardModalTitle}
              onChange={(e) => setCardModalTitle(e.target.value)}
              placeholder="Card title"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setCardModalPriority(priority)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                      cardModalPriority === priority
                        ? getPriorityColor(priority) + ' scale-105'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {getPriorityLabel(priority)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={cardModalDescription}
                onChange={(e) => setCardModalDescription(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100"
                placeholder="Add a more detailed description..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={deleteCard}
                variant="danger"
                icon={Trash2}
              >
                Delete Card
              </Button>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCardModal(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateCard}
                  variant="primary"
                  icon={Edit3}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Comments */}
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 pl-6 overflow-y-auto custom-scrollbar">
            {selectedCard && (
              <CardComments cardId={selectedCard.id} />
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRenameBoardModal}
        onClose={() => {
          setShowRenameBoardModal(false);
          setRenameBoardName('');
        }}
        title="Rename Board"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Board Name"
            value={renameBoardName}
            onChange={(e) => setRenameBoardName(e.target.value)}
            placeholder="New Board Name"
            onKeyDown={(e) => e.key === 'Enter' && renameBoard()}
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setShowRenameBoardModal(false);
                setRenameBoardName('');
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={renameBoard} variant="primary">
              Rename Board
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteBoardModal}
        onClose={() => setShowDeleteBoardModal(false)}
        title="Delete Board"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{boardName}"</span>? This action cannot be undone and will delete all lists and cards in this board.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => setShowDeleteBoardModal(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button 
              onClick={deleteBoard} 
              variant="primary"
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete Board
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Board Modal */}
      <ShareBoardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        boardId={boardId}
        boardName={boardName}
      />
    </div>
  );
}
