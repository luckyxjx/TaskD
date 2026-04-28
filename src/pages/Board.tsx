import { useEffect, useState } from 'react';
import { Search, User, ArrowLeft, Plus, MoreVertical, Trash2, Edit3, Calendar, Tag, Shield, Ban, Users, LayoutGrid, Paperclip, CheckSquare, Pencil, Save, ExternalLink } from 'lucide-react';
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
  assignee_id?: string | null;
  due_date?: string | null;
  label?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface BoardMember {
  id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  email?: string;
}

interface CardAttachment {
  id: string;
  card_id: string;
  name: string;
  url: string;
  file_type: string | null;
  created_at: string;
}

interface ChecklistItem {
  id: string;
  card_id: string;
  title: string;
  completed: boolean;
  position: number;
}

interface RoleState {
  isOwner: boolean;
  isEditor: boolean;
  isViewer: boolean;
  role: 'owner' | 'editor' | 'viewer' | null;
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
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [labelFilter, setLabelFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'none'>('all');
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
  const [newCardAssigneeId, setNewCardAssigneeId] = useState('');
  const [newCardDueDate, setNewCardDueDate] = useState('');
  const [newCardLabel, setNewCardLabel] = useState('');
  const [cardModalTitle, setCardModalTitle] = useState('');
  const [cardModalDescription, setCardModalDescription] = useState('');
  const [cardModalPriority, setCardModalPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [cardModalAssigneeId, setCardModalAssigneeId] = useState('');
  const [cardModalDueDate, setCardModalDueDate] = useState('');
  const [cardModalLabel, setCardModalLabel] = useState('');
  const [renameBoardName, setRenameBoardName] = useState('');
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState<string | null>(null);
  const [roleState, setRoleState] = useState<RoleState>({
    isOwner: false,
    isEditor: false,
    isViewer: true,
    role: 'viewer',
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [attachmentsByCard, setAttachmentsByCard] = useState<Record<string, CardAttachment[]>>({});
  const [checklistByCard, setChecklistByCard] = useState<Record<string, ChecklistItem[]>>({});
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [quickEditingCardId, setQuickEditingCardId] = useState<string | null>(null);
  const [quickEditTitle, setQuickEditTitle] = useState('');

  const canManageBoard = roleState.isOwner;
  const canManageLists = roleState.isOwner || roleState.isEditor;
  const canManageCards = roleState.isOwner || roleState.isEditor;
  const canInteractWithBoard = !loadingRole && (canManageLists || canManageCards);
  const permissionMessage = `You cannot edit this board because your role is ${roleState.role === 'viewer' ? 'Viewer' : 'not allowed'}.`;

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2600);
  };

  const setViewerFallback = () => {
    setRoleState({
      isOwner: false,
      isEditor: false,
      isViewer: true,
      role: 'viewer',
    });
  };

  const loadRole = async (userId?: string | null) => {
    setLoadingRole(true);
    try {
      let resolvedUserId = userId ?? currentUserId;

      if (!resolvedUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        resolvedUserId = user?.id ?? null;
      }

      if (!resolvedUserId) {
        setViewerFallback();
        return;
      }

      setCurrentUserId(resolvedUserId);

      const { data, error } = await supabase
        .from('board_members')
        .select('role')
        .eq('board_id', boardId)
        .eq('user_id', resolvedUserId)
        .single();

      if (error || !data) {
        console.error('Failed to load role:', error);
        setViewerFallback();
        return;
      }

      const userRole = data.role as 'owner' | 'editor' | 'viewer';
      setRoleState({
        isOwner: userRole === 'owner',
        isEditor: userRole === 'editor',
        isViewer: userRole === 'viewer',
        role: userRole,
      });
    } catch (err) {
      console.error('Unexpected error checking role:', err);
      setViewerFallback();
    } finally {
      setLoadingRole(false);
    }
  };

  useEffect(() => {
    loadRole();
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

    const membershipSubscription = supabase
      .channel(`board-members:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'board_members',
          filter: `board_id=eq.${boardId}`
        },
        (payload) => {
          const changedUserId = (payload.new && 'user_id' in payload.new ? payload.new.user_id : null)
            ?? (payload.old && 'user_id' in payload.old ? payload.old.user_id : null);

          if (currentUserId && changedUserId === currentUserId) {
            loadRole(currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      listsSubscription.unsubscribe();
      cardsSubscription.unsubscribe();
      boardSubscription.unsubscribe();
      membershipSubscription.unsubscribe();
    };
  }, [boardId, currentUserId]);

  const loadBoardData = async () => {
    const isInitialLoad = !boardName && lists.length === 0 && cards.length === 0;
    if (isInitialLoad) {
      setLoadingBoard(true);
    }
    setBoardError(null);
    setAccessDenied(false);

    const { data: boardData, error: boardLoadError } = await supabase
      .from('boards')
      .select('name')
      .eq('id', boardId)
      .single();

    if (boardLoadError || !boardData) {
      console.error('Error loading board:', boardLoadError);
      setAccessDenied(true);
      setBoardError('You do not have access to this board, or it no longer exists.');
      setLoadingBoard(false);
      return;
    }

    setBoardName(boardData.name);

    const { data: listsData } = await supabase
      .from('lists')
      .select('*')
      .eq('board_id', boardId)
      .order('position');

    setLists(listsData || []);

    // Guard: Only query cards if we have lists
    if (!listsData || listsData.length === 0) {
      setCards([]);
      await loadBoardMembers();
      setLoadingBoard(false);
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
    await loadCardMetadata((cardsData || []).map((card) => card.id));
    await loadBoardMembers();
    setLoadingBoard(false);
  };

  const loadCardMetadata = async (cardIds: string[]) => {
    if (cardIds.length === 0) {
      setAttachmentsByCard({});
      setChecklistByCard({});
      return;
    }

    const [{ data: attachments, error: attachmentsError }, { data: checklist, error: checklistError }] = await Promise.all([
      supabase
        .from('card_attachments')
        .select('*')
        .in('card_id', cardIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('card_checklist_items')
        .select('*')
        .in('card_id', cardIds)
        .order('position'),
    ]);

    if (attachmentsError) {
      console.error('Error loading attachments:', attachmentsError);
      setAttachmentsByCard({});
    } else {
      setAttachmentsByCard(
        ((attachments || []) as CardAttachment[]).reduce<Record<string, CardAttachment[]>>((acc, attachment) => {
          acc[attachment.card_id] = [...(acc[attachment.card_id] || []), attachment];
          return acc;
        }, {})
      );
    }

    if (checklistError) {
      console.error('Error loading checklist:', checklistError);
      setChecklistByCard({});
    } else {
      setChecklistByCard(
        ((checklist || []) as ChecklistItem[]).reduce<Record<string, ChecklistItem[]>>((acc, item) => {
          acc[item.card_id] = [...(acc[item.card_id] || []), item];
          return acc;
        }, {})
      );
    }
  };

  const loadBoardMembers = async () => {
    const { data, error } = await supabase.rpc('get_board_members', {
      p_board_id: boardId
    });

    if (error) {
      console.error('Error loading board members:', error);
      setBoardMembers([]);
      return;
    }

    setBoardMembers(data || []);
  };

  const createList = async () => {
    if (!canManageLists) return;
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
      showToast('List created');
    }
  };

  const renameBoard = async () => {
    if (!canManageBoard) return;
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
    if (!canManageBoard) return;
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
    if (!canManageCards) return;
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
        assignee_id: newCardAssigneeId || null,
        due_date: newCardDueDate || null,
        label: newCardLabel.trim() || null,
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
      setNewCardAssigneeId('');
      setNewCardDueDate('');
      setNewCardLabel('');
      setShowNewCardModal(false);
      setSelectedListId(null);

      // Log activity
      await supabase.from('activities').insert([{
        board_id: boardId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'created',
        entity_type: 'card',
        entity_id: data.id,
        metadata: { title: data.title, assignee_id: data.assignee_id, due_date: data.due_date, label: data.label }
      }]);
      showToast('Card created');
    }
  };

  const updateCard = async () => {
    if (!canManageCards) return;
    if (!selectedCard) return;

    const { error } = await supabase
      .from('cards')
      .update({
        title: cardModalTitle,
        description: cardModalDescription,
        priority: cardModalPriority,
        assignee_id: cardModalAssigneeId || null,
        due_date: cardModalDueDate || null,
        label: cardModalLabel.trim() || null,
      })
      .eq('id', selectedCard.id);

    if (error) {
      console.error('Error updating card:', error);
      return;
    }

    setCards(
      cards.map((c) =>
        c.id === selectedCard.id
          ? { ...c, title: cardModalTitle, description: cardModalDescription, priority: cardModalPriority, assignee_id: cardModalAssigneeId || null, due_date: cardModalDueDate || null, label: cardModalLabel.trim() || null }
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
    showToast('Card updated');
  };

  const deleteCard = async () => {
    if (!canManageCards) return;
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
    showToast('Card deleted');
  };

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    if (!canManageCards) return;
    e.stopPropagation(); // Prevent event from bubbling to list
    setDraggedCard(card);
    setDraggedList(null); // Clear any list drag state
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canManageCards) return;
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetListId: string) => {
    if (!canManageCards) return;
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
    showToast(`Moved to ${toList?.name || 'another list'}`);
  };

  const handleListDragStart = (e: React.DragEvent, list: List) => {
    if (!canManageLists) return;
    e.stopPropagation(); // Prevent interference with card drag
    setDraggedList(list);
    setDraggedCard(null); // Clear any card drag state
  };

  const handleListDragOver = (e: React.DragEvent) => {
    if (!canManageLists) return;
    e.preventDefault();
  };

  const handleListDrop = async (e: React.DragEvent, targetList: List) => {
    if (!canManageLists) return;
    e.stopPropagation(); // Prevent interference with card drop
    
    if (!draggedList || draggedList.id === targetList.id) {
      setDraggedList(null);
      return;
    }

    const sourcePosition = draggedList.position;
    const targetPosition = targetList.position;

    // Calculate new positions locally first, but only commit after DB succeeds.
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

    for (const list of updatedLists) {
      const { error } = await supabase
        .from('lists')
        .update({ position: list.position })
        .eq('id', list.id);

      if (error) {
        console.error('Error reordering lists:', error);
        setDraggedList(null);
        void loadBoardData();
        return;
      }
    }

    setLists(updatedLists.sort((a, b) => a.position - b.position));
    setDraggedList(null);
  };

  const deleteList = async (listId: string) => {
    if (!canManageLists) return;
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
    setCardModalAssigneeId(card.assignee_id || '');
    setCardModalDueDate(card.due_date || '');
    setCardModalLabel(card.label || '');
    setNewAttachmentName('');
    setNewAttachmentUrl('');
    setNewChecklistTitle('');
    setShowCardModal(true);
  };

  const quickUpdateCardTitle = async (card: Card) => {
    if (!canManageCards || !quickEditTitle.trim()) return;

    const { error } = await supabase
      .from('cards')
      .update({ title: quickEditTitle.trim() })
      .eq('id', card.id);

    if (error) {
      console.error('Error quick editing card:', error);
      return;
    }

    setCards(cards.map((item) => item.id === card.id ? { ...item, title: quickEditTitle.trim() } : item));
    setQuickEditingCardId(null);
    setQuickEditTitle('');
    showToast('Card title updated');
  };

  const addAttachment = async () => {
    if (!selectedCard || !canManageCards || !newAttachmentUrl.trim()) return;

    const safeUrl = newAttachmentUrl.trim();
    const name = newAttachmentName.trim() || safeUrl.replace(/^https?:\/\//, '').split('/')[0] || 'Attachment';
    const { data, error } = await supabase
      .from('card_attachments')
      .insert([{
        card_id: selectedCard.id,
        name,
        url: safeUrl,
        file_type: name.includes('.') ? name.split('.').pop()?.toLowerCase() : null,
        created_by: currentUserId,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding attachment:', error);
      return;
    }

    if (data) {
      setAttachmentsByCard({
        ...attachmentsByCard,
        [selectedCard.id]: [data as CardAttachment, ...(attachmentsByCard[selectedCard.id] || [])],
      });
      setNewAttachmentName('');
      setNewAttachmentUrl('');
      showToast('Attachment added');
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!selectedCard || !canManageCards) return;

    const { error } = await supabase.from('card_attachments').delete().eq('id', attachmentId);
    if (error) {
      console.error('Error deleting attachment:', error);
      return;
    }

    setAttachmentsByCard({
      ...attachmentsByCard,
      [selectedCard.id]: (attachmentsByCard[selectedCard.id] || []).filter((item) => item.id !== attachmentId),
    });
    showToast('Attachment removed');
  };

  const addChecklistItem = async () => {
    if (!selectedCard || !canManageCards || !newChecklistTitle.trim()) return;

    const currentItems = checklistByCard[selectedCard.id] || [];
    const { data, error } = await supabase
      .from('card_checklist_items')
      .insert([{
        card_id: selectedCard.id,
        title: newChecklistTitle.trim(),
        position: currentItems.length,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding checklist item:', error);
      return;
    }

    if (data) {
      setChecklistByCard({
        ...checklistByCard,
        [selectedCard.id]: [...currentItems, data as ChecklistItem],
      });
      setNewChecklistTitle('');
      showToast('Checklist item added');
    }
  };

  const toggleChecklistItem = async (item: ChecklistItem) => {
    if (!canManageCards) return;

    const { error } = await supabase
      .from('card_checklist_items')
      .update({ completed: !item.completed })
      .eq('id', item.id);

    if (error) {
      console.error('Error updating checklist item:', error);
      return;
    }

    setChecklistByCard({
      ...checklistByCard,
      [item.card_id]: (checklistByCard[item.card_id] || []).map((entry) =>
        entry.id === item.id ? { ...entry, completed: !entry.completed } : entry
      ),
    });
  };

  const deleteChecklistItem = async (item: ChecklistItem) => {
    if (!canManageCards) return;

    const { error } = await supabase.from('card_checklist_items').delete().eq('id', item.id);
    if (error) {
      console.error('Error deleting checklist item:', error);
      return;
    }

    setChecklistByCard({
      ...checklistByCard,
      [item.card_id]: (checklistByCard[item.card_id] || []).filter((entry) => entry.id !== item.id),
    });
  };

  const getAssigneeEmail = (assigneeId?: string | null) => {
    if (!assigneeId) return 'Unassigned';
    return boardMembers.find((member) => member.user_id === assigneeId)?.email || 'Assigned';
  };

  const formatDueDate = (dueDate?: string | null) => {
    if (!dueDate) return '';
    return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const isDoneCard = (card: Card) => {
    const list = lists.find((item) => item.id === card.list_id);
    return list?.name.toLowerCase() === 'done';
  };

  const isOverdue = (card: Card) => {
    if (!card.due_date || isDoneCard(card)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(`${card.due_date}T00:00:00`) < today;
  };

  const getDueStatus = (card: Card): 'none' | 'overdue' | 'today' | 'upcoming' => {
    if (!card.due_date) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${card.due_date}T00:00:00`);
    if (due < today && !isDoneCard(card)) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  const uniqueLabels = Array.from(new Set(cards.map((card) => card.label).filter(Boolean) as string[])).sort();

  const analytics = {
    total: cards.length,
    completed: cards.filter(isDoneCard).length,
    overdue: cards.filter(isOverdue).length,
    urgent: cards.filter((card) => card.priority === 'urgent').length,
    assignedToMe: currentUserId ? cards.filter((card) => card.assignee_id === currentUserId).length : 0,
  };

  const completionRate = analytics.total > 0 ? Math.round((analytics.completed / analytics.total) * 100) : 0;

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
      .filter((card) => {
        const query = searchQuery.toLowerCase();
        const assignee = getAssigneeEmail(card.assignee_id).toLowerCase();
        const matchesSearch = !query || card.title.toLowerCase().includes(query) || (card.description || '').toLowerCase().includes(query) || (card.label || '').toLowerCase().includes(query) || assignee.includes(query);
        const matchesPriority = priorityFilter === 'all' || card.priority === priorityFilter;
        const matchesAssignee = assigneeFilter === 'all' || (assigneeFilter === 'unassigned' ? !card.assignee_id : card.assignee_id === assigneeFilter);
        const matchesLabel = labelFilter === 'all' || card.label === labelFilter;
        const matchesDue = dueFilter === 'all' || getDueStatus(card) === dueFilter;
        return matchesSearch && matchesPriority && matchesAssignee && matchesLabel && matchesDue;
      })
      .sort((a, b) => a.position - b.position);
  };

  const disabledActionClass = 'opacity-55 cursor-not-allowed grayscale';

  if (loadingBoard) {
    return (
      <div className="app-shell p-6">
        <div className="relative z-10 max-w-7xl mx-auto space-y-6">
          <div className="surface-header rounded-2xl p-5">
            <div className="skeleton w-48 h-9 rounded mb-4" />
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="surface-card rounded-xl p-4 h-24">
                  <div className="skeleton w-24 h-4 rounded mb-4" />
                  <div className="skeleton w-14 h-8 rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2].map((item) => (
              <div key={item} className="surface-panel rounded-2xl p-4 w-80 flex-shrink-0">
                <div className="skeleton w-28 h-5 rounded mb-5" />
                <div className="space-y-3">
                  <div className="skeleton h-28 rounded-xl" />
                  <div className="skeleton h-24 rounded-xl" />
                  <div className="skeleton h-28 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="app-shell flex items-center justify-center p-6">
        <div className="relative z-10 max-w-md w-full surface-card rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 flex items-center justify-center mx-auto mb-4">
            <Ban className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{boardError}</p>
          <Button onClick={onBack} variant="primary" icon={ArrowLeft}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex flex-col">
      <header className="surface-header px-4 sm:px-6 py-4 flex-shrink-0 relative z-10">
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white truncate">
              {boardName}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${roleState.isViewer ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' : 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'}`}>
                <Shield className="w-4 h-4" />
                {roleState.role ? `${roleState.role.charAt(0).toUpperCase() + roleState.role.slice(1)} role` : 'Checking role'}
              </span>
              {!loadingRole && (
                <button
                  onClick={() => canManageBoard && setShowShareModal(true)}
                  disabled={!canManageBoard}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 transition-all duration-200 ${canManageBoard ? 'hover:bg-primary-200 dark:hover:bg-primary-900/50' : disabledActionClass}`}
                  title={!canManageBoard ? 'Only board owners can manage sharing.' : 'Share board'}
                >
                  <ShareIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">Share</span>
                </button>
              )}

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
              {!loadingRole && (
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
                      <>
                          <button
                            onClick={() => {
                              if (!canManageBoard) return;
                              setRenameBoardName(boardName);
                              setShowRenameBoardModal(true);
                              setShowBoardMenu(false);
                            }}
                            disabled={!canManageBoard}
                            title={!canManageBoard ? permissionMessage : 'Rename board'}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${canManageBoard ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                          >
                            <Edit3 className="w-4 h-4" />
                            Rename Board
                          </button>
                          <button
                            onClick={() => {
                              if (!canManageBoard) return;
                              setShowDeleteBoardModal(true);
                              setShowBoardMenu(false);
                            }}
                            disabled={!canManageBoard}
                            title={!canManageBoard ? permissionMessage : 'Delete board'}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${canManageBoard ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Board
                          </button>
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
                        {!canManageBoard && (
                          <p className="px-4 pt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 mt-1">
                            {permissionMessage}
                          </p>
                        )}
                      </>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="relative w-full lg:w-auto lg:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none backdrop-blur-sm transition-all duration-200 w-full lg:w-64 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
        {!loadingRole && roleState.isViewer && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
            <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <span>{permissionMessage} Read-only mode is active, so editing, moving, deleting, and member management are disabled.</span>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ['Total tasks', analytics.total],
            ['Completed', `${analytics.completed} (${completionRate}%)`],
            ['Overdue', analytics.overdue],
            ['Urgent', analytics.urgent],
            ['Assigned to me', analytics.assignedToMe],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)} className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100">
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100">
            <option value="all">All assignees</option>
            {currentUserId && <option value={currentUserId}>Assigned to me</option>}
            <option value="unassigned">Unassigned</option>
            {boardMembers.map((member) => (
              <option key={member.user_id} value={member.user_id}>{member.email || member.role}</option>
            ))}
          </select>
          <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100">
            <option value="all">All labels</option>
            {uniqueLabels.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
          <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value as typeof dueFilter)} className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100">
            <option value="all">All due dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="upcoming">Upcoming</option>
            <option value="none">No due date</option>
          </select>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-6 custom-scrollbar relative z-10" data-board-role={roleState.role ?? 'unknown'} data-can-interact={canInteractWithBoard}>
        <div className="flex gap-4 h-full">
          {/* Lists Container */}
          <div className="flex gap-4 min-w-max pb-4 flex-1">
          {lists.map((list, index) => (
            <div
              key={list.id}
              draggable={canManageLists}
              onDragStart={canManageLists ? (e) => handleListDragStart(e, list) : undefined}
              onDragOver={canManageLists ? handleListDragOver : undefined}
              onDrop={canManageLists ? (e) => handleListDrop(e, list) : undefined}
              className={`surface-panel rounded-2xl p-4 w-80 flex flex-col flex-shrink-0 animate-fade-in-up ${canManageLists ? 'cursor-move' : 'cursor-default'}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{list.name}</h3>
                {!loadingRole && (
                  <div className="relative">
                    <button
                      onClick={() => setShowListMenu(showListMenu === list.id ? null : list.id)}
                      className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-all"
                      title={!canManageLists ? permissionMessage : 'List options'}
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    {showListMenu === list.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
                        <button
                          onClick={() => {
                            if (!canManageLists) return;
                            if (confirm(`Delete list "${list.name}" and all its cards?`)) {
                              deleteList(list.id);
                            }
                          }}
                          disabled={!canManageLists}
                          title={!canManageLists ? permissionMessage : 'Delete list'}
                          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 transition-colors ${canManageLists ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete List
                        </button>
                        {!canManageLists && (
                          <p className="px-4 pt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 mt-1">
                            {permissionMessage}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div 
                className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1"
                onDragOver={canManageCards ? handleDragOver : undefined}
                onDrop={canManageCards ? (e) => handleDrop(e, list.id) : undefined}
              >
                {getListCards(list.id).map((card, cardIndex) => (
                  <div
                    key={card.id}
                    draggable={canManageCards}
                    onDragStart={canManageCards ? (e) => handleDragStart(e, card) : undefined}
                    onClick={() => openCardModal(card)}
                    className={`surface-card surface-card-hover backdrop-blur-sm p-4 rounded-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group animate-fade-in ${card.priority === 'urgent' ? 'urgent-glow' : ''} ${draggedCard?.id === card.id ? 'opacity-70 rotate-2 scale-[1.02]' : ''} ${canManageCards ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    style={{ animationDelay: `${cardIndex * 30}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {quickEditingCardId === card.id ? (
                        <input
                          value={quickEditTitle}
                          onChange={(e) => setQuickEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void quickUpdateCardTitle(card);
                            }
                            if (e.key === 'Escape') {
                              setQuickEditingCardId(null);
                              setQuickEditTitle('');
                            }
                          }}
                          className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-gray-900 border border-primary-300 dark:border-primary-700 text-sm text-gray-900 dark:text-gray-100 outline-none"
                          autoFocus
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex-1">
                          {card.title}
                        </p>
                      )}
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(card.priority || 'medium')} whitespace-nowrap`}>
                        {getPriorityLabel(card.priority || 'medium')}
                      </span>
                    </div>
                    {!loadingRole && (
                      <div className="flex items-center gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {quickEditingCardId === card.id ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canManageCards) void quickUpdateCardTitle(card);
                            }}
                            disabled={!canManageCards}
                            title={!canManageCards ? permissionMessage : 'Save quick edit'}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-semibold ${!canManageCards ? disabledActionClass : ''}`}
                          >
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!canManageCards) return;
                              setQuickEditingCardId(card.id);
                              setQuickEditTitle(card.title);
                            }}
                            disabled={!canManageCards}
                            title={!canManageCards ? permissionMessage : 'Quick edit card title'}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/70 dark:bg-gray-900/70 text-gray-600 dark:text-gray-300 text-xs font-semibold ${!canManageCards ? disabledActionClass : ''}`}
                          >
                            <Pencil className="w-3 h-3" />
                            Quick edit
                          </button>
                        )}
                      </div>
                    )}
                    {card.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                        {card.description}
                      </p>
                    )}
                    {(() => {
                      const checklist = checklistByCard[card.id] || [];
                      const attachments = attachmentsByCard[card.id] || [];
                      const completed = checklist.filter((item) => item.completed).length;
                      return (checklist.length > 0 || attachments.length > 0) ? (
                        <div className="flex items-center gap-2 flex-wrap mt-3 text-xs text-gray-500 dark:text-gray-400">
                          {checklist.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/60 dark:bg-gray-900/60">
                              <CheckSquare className="w-3 h-3" />
                              {completed}/{checklist.length}
                            </span>
                          )}
                          {attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/60 dark:bg-gray-900/60">
                              <Paperclip className="w-3 h-3" />
                              {attachments.length}
                            </span>
                          )}
                        </div>
                      ) : null;
                    })()}
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      {card.assignee_id && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 max-w-full">
                          <Users className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{getAssigneeEmail(card.assignee_id)}</span>
                        </span>
                      )}
                      {card.due_date && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${isOverdue(card) ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300' : 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'}`}>
                          <Calendar className="w-3 h-3" />
                          {formatDueDate(card.due_date)}
                        </span>
                      )}
                      {card.label && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent-100 dark:bg-accent-900/30 text-xs font-medium text-accent-700 dark:text-accent-300">
                          <Tag className="w-3 h-3" />
                          {card.label}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {getListCards(list.id).length === 0 && (
                  <div className="border border-dashed border-white/10 rounded-xl py-10 px-4 text-center">
                    <LayoutGrid className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-400">No tasks here yet</p>
                    <p className="text-xs text-gray-600 mt-1">Cards matching your filters will appear here.</p>
                  </div>
                )}
              </div>
              {!loadingRole && (
                <button
                  onClick={() => {
                    if (!canManageCards) return;
                    setSelectedListId(list.id);
                    setShowNewCardModal(true);
                  }}
                  disabled={!canManageCards}
                  title={!canManageCards ? permissionMessage : 'Add card'}
                  className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${canManageCards ? 'text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white/50 dark:hover:bg-gray-800/50' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed border border-dashed border-gray-200 dark:border-gray-700'}`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-semibold">Add card</span>
                </button>
              )}
              {/* View-only mode indicator for viewers */}
              {!loadingRole && roleState.isViewer && (
                <div className="mt-4 px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl" title={permissionMessage}>
                  View-only mode
                </div>
              )}
            </div>
          ))}

          {!loadingRole && (
            <button
              onClick={() => canManageLists && setShowNewListModal(true)}
              disabled={!canManageLists}
              title={!canManageLists ? permissionMessage : 'Add list'}
              className={`glass border-2 border-dashed rounded-2xl p-6 w-80 flex flex-col items-center justify-center gap-3 transition-all duration-200 flex-shrink-0 min-h-[200px] group bg-gray-50 dark:bg-gray-800/50 ${canManageLists ? 'hover:bg-white/80 dark:hover:bg-gray-800/80 border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400' : 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'}`}
            >
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Plus className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <span className="font-semibold">Add list</span>
              {!canManageLists && <span className="text-xs text-center">{permissionMessage}</span>}
            </button>
          )}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assignee</label>
              <select value={newCardAssigneeId} onChange={(e) => setNewCardAssigneeId(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100">
                <option value="">Unassigned</option>
                {boardMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>{member.email || member.role}</option>
                ))}
              </select>
            </div>
            <Input label="Due Date" type="date" value={newCardDueDate} onChange={(e) => setNewCardDueDate(e.target.value)} />
            <Input label="Label" value={newCardLabel} onChange={(e) => setNewCardLabel(e.target.value)} placeholder="Design, Bug, Urgent" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => {
                setShowNewCardModal(false);
                setSelectedListId(null);
                setNewCardDescription('');
                setNewCardAssigneeId('');
                setNewCardDueDate('');
                setNewCardLabel('');
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
              disabled={roleState.isViewer}
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
                    onClick={() => !roleState.isViewer && setCardModalPriority(priority)}
                    disabled={roleState.isViewer}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                      cardModalPriority === priority
                        ? getPriorityColor(priority) + ' scale-105'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${roleState.isViewer ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    {getPriorityLabel(priority)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assignee</label>
                <select value={cardModalAssigneeId} onChange={(e) => setCardModalAssigneeId(e.target.value)} disabled={roleState.isViewer} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed">
                  <option value="">Unassigned</option>
                  {boardMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>{member.email || member.role}</option>
                  ))}
                </select>
              </div>
              <Input label="Due Date" type="date" value={cardModalDueDate} onChange={(e) => setCardModalDueDate(e.target.value)} disabled={roleState.isViewer} />
              <Input label="Label" value={cardModalLabel} onChange={(e) => setCardModalLabel(e.target.value)} placeholder="Design, Bug, Urgent" disabled={roleState.isViewer} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={cardModalDescription}
                onChange={(e) => setCardModalDescription(e.target.value)}
                rows={8}
                disabled={roleState.isViewer}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all duration-200 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Add a more detailed description..."
              />
            </div>

            {selectedCard && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Checklist</h3>
                  </div>
                  <div className="space-y-2">
                    {(checklistByCard[selectedCard.id] || []).length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-3">No subtasks yet</p>
                    ) : (
                      (checklistByCard[selectedCard.id] || []).map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            disabled={!canManageCards}
                            onChange={() => toggleChecklistItem(item)}
                            title={!canManageCards ? permissionMessage : 'Toggle subtask'}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600"
                          />
                          <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {item.title}
                          </span>
                          <button
                            onClick={() => canManageCards && deleteChecklistItem(item)}
                            disabled={!canManageCards}
                            title={!canManageCards ? permissionMessage : 'Remove subtask'}
                            className={`text-xs ${canManageCards ? 'opacity-0 group-hover:opacity-100 text-danger-600 dark:text-danger-400' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <input
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && canManageCards && addChecklistItem()}
                      placeholder={canManageCards ? 'Add subtask...' : permissionMessage}
                      disabled={!canManageCards}
                      title={!canManageCards ? permissionMessage : 'Add subtask'}
                      className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <Button onClick={addChecklistItem} variant="secondary" size="sm" disabled={!canManageCards} title={!canManageCards ? permissionMessage : 'Add subtask'}>Add</Button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Attachments</h3>
                  </div>
                  <div className="space-y-2">
                    {(attachmentsByCard[selectedCard.id] || []).length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-3">No attachments yet</p>
                    ) : (
                      (attachmentsByCard[selectedCard.id] || []).map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 group">
                          <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <a href={attachment.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{attachment.name}</span>
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              Preview <ExternalLink className="w-3 h-3" />
                            </span>
                          </a>
                          <button
                            onClick={() => canManageCards && deleteAttachment(attachment.id)}
                            disabled={!canManageCards}
                            title={!canManageCards ? permissionMessage : 'Remove attachment'}
                            className={`text-xs ${canManageCards ? 'opacity-0 group-hover:opacity-100 text-danger-600 dark:text-danger-400' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-2 mt-4">
                    <input
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      placeholder={canManageCards ? 'Attachment name' : permissionMessage}
                      disabled={!canManageCards}
                      title={!canManageCards ? permissionMessage : 'Attachment name'}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <div className="flex gap-2">
                      <input
                        value={newAttachmentUrl}
                        onChange={(e) => setNewAttachmentUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && canManageCards && addAttachment()}
                        placeholder={canManageCards ? 'https://...' : permissionMessage}
                        disabled={!canManageCards}
                        title={!canManageCards ? permissionMessage : 'Attachment URL'}
                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <Button onClick={addAttachment} variant="secondary" size="sm" disabled={!canManageCards} title={!canManageCards ? permissionMessage : 'Add attachment'}>Add</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!loadingRole && canManageCards && (
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
            )}
            {!loadingRole && roleState.isViewer && (
              <div className="flex gap-3 justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3">
                  <Button
                    onClick={deleteCard}
                    variant="danger"
                    icon={Trash2}
                    disabled
                    title={permissionMessage}
                  >
                    Delete Card
                  </Button>
                  <Button
                    onClick={updateCard}
                    variant="primary"
                    icon={Edit3}
                    disabled
                    title={permissionMessage}
                  >
                    Save Changes
                  </Button>
                </div>
                <Button
                  onClick={() => setShowCardModal(false)}
                  variant="secondary"
                >
                  Close
                </Button>
              </div>
            )}
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
        onClose={() => {
          setShowShareModal(false);
          void loadRole(currentUserId);
        }}
        boardId={boardId}
        boardName={boardName}
      />
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[70] surface-card rounded-xl px-4 py-3 text-sm font-semibold text-white animate-fade-in shadow-2xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
