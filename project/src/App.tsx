import React, { useState, useEffect, useCallback } from 'react';
import { facts } from './data/facts';
import { Timer, Trophy, Brain, LogIn, LogOut, Crown, Share2 } from 'lucide-react';
import { supabase } from './lib/supabase';

function App() {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(7);
  const [gameOver, setGameOver] = useState(false);
  const [shuffledFacts, setShuffledFacts] = useState<typeof facts>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ nickname: string; score: number }[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Initialize and shuffle facts with 50/50 distribution
  useEffect(() => {
    const trueFacts = facts.filter(f => f.isTrue);
    const falseFacts = facts.filter(f => !f.isTrue);
    
    // Take equal amounts of true and false facts
    const selectedTrue = trueFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
    const selectedFalse = falseFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
    
    const shuffled = [...selectedTrue, ...selectedFalse].sort(() => Math.random() - 0.5);
    setShuffledFacts(shuffled);
  }, []);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUser({ email: session.user.email });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUser({ email: session.user.email });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Timer logic
  useEffect(() => {
    if (gameOver || isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameOver(true);
          if (user) {
            updateLeaderboard();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentFactIndex, gameOver, isAnswered]);

  const updateLeaderboard = async () => {
    if (!user?.email) return;
    
    const nickname = user.email.split('@')[0];
    await supabase
      .from('leaderboard')
      .upsert({ nickname, score }, { onConflict: 'nickname' });
      
    fetchLeaderboard();
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    
    if (data) {
      setLeaderboard(data);
    }
  };

  const handleGuess = useCallback((guess: boolean) => {
    if (gameOver || isAnswered) return;

    const isCorrect = guess === shuffledFacts[currentFactIndex].isTrue;
    setLastAnswerCorrect(isCorrect);
    setIsAnswered(true);

    if (isCorrect) {
      setTimeout(() => {
        setScore((prev) => prev + 1);
        if (currentFactIndex >= shuffledFacts.length - 2) {
          const trueFacts = facts.filter(f => f.isTrue);
          const falseFacts = facts.filter(f => !f.isTrue);
          const selectedTrue = trueFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
          const selectedFalse = falseFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
          setShuffledFacts([...selectedTrue, ...selectedFalse].sort(() => Math.random() - 0.5));
          setCurrentFactIndex(0);
        } else {
          setCurrentFactIndex((prev) => prev + 1);
        }
        setTimeLeft(7);
        setIsAnswered(false);
        setLastAnswerCorrect(null);
      }, 1000);
    } else {
      setGameOver(true);
      if (user) {
        updateLeaderboard();
      }
    }
  }, [currentFactIndex, gameOver, isAnswered, shuffledFacts, user]);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error('Error logging in:', error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const resetGame = useCallback(() => {
    const trueFacts = facts.filter(f => f.isTrue);
    const falseFacts = facts.filter(f => !f.isTrue);
    const selectedTrue = trueFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
    const selectedFalse = falseFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
    setShuffledFacts([...selectedTrue, ...selectedFalse].sort(() => Math.random() - 0.5));
    setCurrentFactIndex(0);
    setScore(0);
    setTimeLeft(7);
    setGameOver(false);
    setIsAnswered(false);
    setLastAnswerCorrect(null);
  }, []);

  const currentFact = shuffledFacts[currentFactIndex];
  if (!currentFact) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="flex items-center gap-2 text-white hover:text-yellow-300 transition-colors"
          >
            <Crown className="w-6 h-6" />
            <span>Leaderboard</span>
          </button>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-white">{user.email.split('@')[0]}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-white hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 text-white hover:text-green-300 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                Login
              </button>
            )}
          </div>
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Leaderboard Panel */}
          {showLeaderboard && (
            <div className="lg:col-span-1 bg-white rounded-xl shadow-2xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                Top Players
              </h2>
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div key={entry.nickname} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-semibold">#{index + 1} {entry.nickname}</span>
                    <span className="text-indigo-600">{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game Panel */}
          <div className={`${showLeaderboard ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-xl shadow-2xl p-8`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <span className="text-2xl font-bold">Score: {score}</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="w-6 h-6 text-red-500" />
                <span className="text-2xl font-bold">{timeLeft}s</span>
              </div>
            </div>

            {gameOver ? (
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
                <p className="text-xl mb-8">Final Score: {score}</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={resetGame}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => {
                      const text = `I scored ${score} points in True or False! Can you beat my score?`;
                      navigator.clipboard.writeText(text);
                    }}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    Share Score
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-6 h-6 text-purple-500" />
                    <h2 className="text-xl font-semibold">Fact #{score + 1}</h2>
                  </div>
                  <p className="text-lg leading-relaxed">{currentFact.statement}</p>
                </div>

                {/* True/False Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleGuess(false)}
                    disabled={isAnswered}
                    className={`p-4 text-lg font-semibold rounded-lg transition-colors ${
                      isAnswered
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    False
                  </button>
                  <button
                    onClick={() => handleGuess(true)}
                    disabled={isAnswered}
                    className={`p-4 text-lg font-semibold rounded-lg transition-colors ${
                      isAnswered
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    True
                  </button>
                </div>

                {lastAnswerCorrect !== null && (
                  <div className={`mt-4 text-center font-semibold ${
                    lastAnswerCorrect ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {lastAnswerCorrect ? 'Correct!' : 'Wrong!'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;