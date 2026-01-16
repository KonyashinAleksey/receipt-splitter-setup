import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getUserBoards } from '../lib/proxy-client';
import { initTelegramWebApp } from '../lib/telegram';
import { Link } from 'react-router-dom';
import Footer from './Footer';

type SimpleBoard = {
  id: string;
  name: string;
  total_amount: number | null;
  created_at: string;
  restaurant?: { name?: string } | null;
  restaurant_name?: string;
  is_creator?: boolean;
};

const MyBoards: React.FC = () => {
  const handleShare = (boardId: string, title: string) => {
    const tg = (window as any)?.Telegram?.WebApp;
    const deepLink = `https://t.me/SplitterReceipt_bot?start=join_${boardId}`;
    const text = `Приглашение в доску «${title}». Нажмите, чтобы присоединиться:`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank');
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<SimpleBoard[]>([]);
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'created' | 'invited'>('created');

  useEffect(() => {
    initTelegramWebApp();
    
    // Пробуем разные способы получения telegram_id
    const tgWebApp = (window as any)?.Telegram?.WebApp;
    let tgUserId: number | null = null;
    
    if (tgWebApp?.initDataUnsafe?.user?.id) {
      tgUserId = tgWebApp.initDataUnsafe.user.id;
    } else if (tgWebApp?.initData) {
      // Парсим initData если initDataUnsafe недоступен
      try {
        const urlParams = new URLSearchParams(tgWebApp.initData);
        const userParam = urlParams.get('user');
        if (userParam) {
          const user = JSON.parse(decodeURIComponent(userParam));
          tgUserId = user.id;
        }
      } catch (e) {
        console.error('Error parsing initData:', e);
      }
    }
    
    setTelegramUserId(tgUserId);

    console.log('🔍 MyBoards: Telegram user ID:', tgUserId);
    console.log('🔍 MyBoards: Telegram WebApp:', tgWebApp);
    console.log('🔍 MyBoards: initDataUnsafe:', tgWebApp?.initDataUnsafe);
    console.log('🔍 MyBoards: initData:', tgWebApp?.initData);

    const load = async () => {
      const startTime = performance.now();
      
      // Небольшая задержка, чтобы Telegram SDK успел проинициализироваться
      if (!tgUserId) {
        await new Promise(r => setTimeout(r, 500));
        // Пробуем получить еще раз
        const retryUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
        if (retryUser) {
            tgUserId = retryUser.id;
            setTelegramUserId(tgUserId);
        }
      }

      try {
        setLoading(true);
        setError(null);

        if (!tgUserId) {
          // Если это локальная разработка, можно использовать тестовый ID (опционально)
          const isLocal = window.location.hostname === 'localhost';
          if (isLocal) {
             console.log('🔧 Localhost detected, using fallback ID');
             // tgUserId = ...; // Можно раскомментировать для тестов
          } else {
             console.log('❌ MyBoards: No telegram user ID found after retry');
             
             // LOG ERROR
             supabase.from('debug_logs').insert({
                user_id: 0,
                message: 'No Telegram ID found',
                meta: { step: 'init', duration: Math.round(performance.now() - startTime) }
             }).then(() => {});

             setError('Не удалось получить данные пользователя. Попробуйте перезапустить Mini App.');
          setLoading(false);
          return;
        }
        }

        // 1) Загружаем доски через прокси
        console.log('🔍 MyBoards: Loading boards via proxy for user:', tgUserId);
        
        const rpcStart = performance.now();
        try {
          const rpcData = await getUserBoards(tgUserId!);

          if (rpcData) {
             console.log('✅ MyBoards: Loaded via proxy:', rpcData.length);
             setBoards(rpcData as SimpleBoard[]);
             setLoading(false);
             
             // LOG SUCCESS
             const totalTime = Math.round(performance.now() - startTime);
             const rpcTime = Math.round(performance.now() - rpcStart);
             supabase.from('debug_logs').insert({
                user_id: tgUserId,
                message: `Loaded ${rpcData.length} boards`,
                meta: { step: 'proxy_load', duration: totalTime, rpc_duration: rpcTime }
             }).then(() => {});

             return;
          }
        } catch (rpcError: any) {
             console.warn('⚠️ MyBoards: Proxy failed, falling back to regular query.', rpcError);
             // LOG RPC ERROR
             supabase.from('debug_logs').insert({
                user_id: tgUserId,
                message: `Proxy Failed: ${rpcError.message}`,
                meta: { step: 'proxy_error', duration: Math.round(performance.now() - startTime) }
             }).then(() => {});
        }

        // --- FALLBACK (Старый медленный метод) ---
        // 1) Находим все участники по telegram_id пользователя
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('telegram_id', tgUserId)
          .single();

        if (profileErr) {
          console.error('❌ MyBoards: Error fetching profile:', profileErr);
          setError('Пользователь не найден');
          setLoading(false);
          return;
        }

        if (!profile) {
          console.log('❌ MyBoards: Profile not found for telegram_id:', tgUserId);
          setBoards([]);
          setLoading(false);
          return;
        }

        // Теперь ищем участников по profile_id
        const { data: participants, error: pErr } = await supabase
          .from('participants')
          .select('board_id, is_creator')
          .eq('profile_id', profile.id);

        if (pErr) {
          console.error('❌ MyBoards: Error fetching participants:', pErr);
          throw pErr;
        }

        console.log('🔍 MyBoards: Found participants:', participants);
        console.log('🔍 MyBoards: Participants count:', participants?.length || 0);

        const boardIds = Array.from(new Set((participants || []).map(p => p.board_id)));
        console.log('🔍 MyBoards: Board IDs:', boardIds);
        console.log('🔍 MyBoards: Unique board count:', boardIds.length);

        if (boardIds.length === 0) {
          setBoards([]);
          setLoading(false);
          return;
        }

        // 2) Загружаем сами доски по списку id
        const { data: boardsData, error: bErr } = await supabase
          .from('boards')
          .select('id, name, total_amount, created_at, restaurant_name, restaurant:restaurants(name)')
          .in('id', boardIds)
          .order('created_at', { ascending: false });

        if (bErr) throw bErr;

        // 3) Добавляем информацию о том, является ли пользователь создателем
        const boardsWithCreatorInfo = (boardsData || []).map(board => {
          const participant = participants?.find(p => p.board_id === board.id);
          return {
            ...board,
            is_creator: participant?.is_creator || false
          };
        });

        setBoards(boardsWithCreatorInfo as SimpleBoard[]);
      } catch (e: any) {
        setError(e?.message || 'Ошибка загрузки досок');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <div style={{ padding: 16 }}>Загрузка...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <h3>ReceiptSplitter</h3>
        <p>{error}</p>
      </div>
    );
  }

  // Разделяем доски на созданные и приглашенные
  const createdBoards = boards.filter(b => b.is_creator);
  const invitedBoards = boards.filter(b => !b.is_creator);

  // Стили для вкладок
  const tabStyle = {
    flex: 1,
    padding: '10px',
    textAlign: 'center' as const,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    userSelect: 'none' as const,
  };

  const activeTabStyle = {
    ...tabStyle,
    background: 'var(--tg-theme-button-color, #007aff)',
    color: 'var(--tg-theme-button-text-color, #ffffff)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  };

  const inactiveTabStyle = {
    ...tabStyle,
    background: 'transparent',
    color: 'var(--tg-theme-hint-color, #999999)',
  };

  return (
    <div style={{ padding: 16 }}>
      <div className="board-header" style={{ padding: 0, background: 'transparent', boxShadow: 'none', marginBottom: 20 }}>
        <div className="board-title">
          <h1>Мои чеки</h1>
        </div>
      </div>
      
      {/* Вкладки */}
      <div style={{ display: 'flex', background: 'var(--tg-theme-secondary-bg-color, #eef1f5)', padding: '4px', borderRadius: '12px', marginBottom: '20px' }}>
        <div
          style={activeTab === 'created' ? activeTabStyle : inactiveTabStyle}
          onClick={() => setActiveTab('created')}
        >
          🏗️ Созданные мной
        </div>
        <div
          style={activeTab === 'invited' ? activeTabStyle : inactiveTabStyle}
          onClick={() => setActiveTab('invited')}
        >
          📨 Приглашения
        </div>
      </div>
      
      {boards.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)' }}>У вас пока нет досок. Загрузите фото чека в боте, чтобы создать первую.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Созданные доски */}
          {activeTab === 'created' && (
            <>
              {createdBoards.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)' }}>Нет созданных досок</p>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {createdBoards.map((b) => (
                  <div key={b.id} style={{
                    border: '1px solid #e9ecef',
                    borderRadius: 8,
                    padding: 12,
                    background: 'var(--tg-theme-bg-color, #ffffff)',
                    color: 'var(--tg-theme-text-color, #000000)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--tg-theme-text-color, #000000)' }}>
                            {(b.restaurant_name || b.restaurant?.name || b.name || 'Без названия')}
                        </div>
                        <div style={{ color: 'var(--tg-theme-hint-color, #999999)', fontSize: 14 }}>
                          {new Date(b.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            {' • '}
                            {new Date(b.created_at).toLocaleDateString('ru-RU')}
                        </div>
                        <div style={{ color: 'var(--tg-theme-text-color, #000000)', fontSize: 14, marginTop: 4 }}>
                          Сумма: {b.total_amount ?? 0}₽
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link to={`/board/${b.id}`} className="tg-btn" style={{ padding: '8px 12px', background: 'var(--tg-theme-button-color, #007aff)', color: 'var(--tg-theme-button-text-color, #fff)', borderRadius: 6, textDecoration: 'none' }}>
                          📱 Открыть доску
                        </Link>
                          <button onClick={() => handleShare(b.id, (b.restaurant_name || b.restaurant?.name || b.name || 'Без названия'))} style={{ padding: '8px 12px', background: 'var(--tg-theme-secondary-bg-color, #e9ecef)', color: 'var(--tg-theme-text-color, #000000)', border: 'none', borderRadius: 6 }}>
                          👥 Поделиться
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </>
          )}

          {/* Приглашенные доски */}
          {activeTab === 'invited' && (
            <>
              {invitedBoards.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)' }}>Нет приглашений</p>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {invitedBoards.map((b) => (
                  <div key={b.id} style={{
                    border: '1px solid #e9ecef',
                    borderRadius: 8,
                    padding: 12,
                    background: 'var(--tg-theme-bg-color, #ffffff)',
                    color: 'var(--tg-theme-text-color, #000000)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--tg-theme-text-color, #000000)' }}>
                            {(b.restaurant_name || b.restaurant?.name || b.name || 'Без названия')}
                        </div>
                        <div style={{ color: 'var(--tg-theme-hint-color, #999999)', fontSize: 14 }}>
                          {new Date(b.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            {' • '}
                            {new Date(b.created_at).toLocaleDateString('ru-RU')}
                        </div>
                        <div style={{ color: 'var(--tg-theme-text-color, #000000)', fontSize: 14, marginTop: 4 }}>
                          Сумма: {b.total_amount ?? 0}₽
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link to={`/board/${b.id}`} className="tg-btn" style={{ padding: '8px 12px', background: 'var(--tg-theme-button-color, #007aff)', color: 'var(--tg-theme-button-text-color, #fff)', borderRadius: 6, textDecoration: 'none' }}>
                          📱 Открыть доску
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </>
          )}
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default MyBoards;
