import React, { useState, useEffect, useCallback, useRef } from 'react';
import { facts } from './data/facts';
import { Timer, Trophy, Brain, Crown, Share2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import {
  TwitterShareButton,
  WhatsappShareButton,
  FacebookShareButton,
} from 'react-share';
import { TwitterIcon, WhatsappIcon, FacebookIcon } from 'react-share';

function App() {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(7);
  const [gameOver, setGameOver] = useState(false);
  const [shuffledFacts, setShuffledFacts] = useState<typeof facts>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ nickname: string; score: number }[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [lastIncorrectFact, setLastIncorrectFact] = useState<{ statement: string; isTrue: boolean } | null>(null);
  const [nameInput, setNameInput] = useState('');
  const leaderboardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({}); // Ref to store leaderboard entries

  const shareUrl = 'https://factfrenzy.info';

  useEffect(() => {
    const trueFacts = facts.filter(f => f.isTrue);
    const falseFacts = facts.filter(f => !f.isTrue);
    const selectedTrue = trueFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
    const selectedFalse = falseFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
    const shuffled = [...selectedTrue, ...selectedFalse].sort(() => Math.random() - 0.5);
    setShuffledFacts(shuffled);
  }, []);

  useEffect(() => {
    if (gameOver || isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameOver(true);
          fetchLeaderboard();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentFactIndex, gameOver, isAnswered]);

  const updateLeaderboard = async (nickname: string) => {
  if (!nickname) return;
  const { data: existing } = await supabase
    .from('leaderboard')
    .select('score')
    .eq('nickname', nickname)
    .single();

  if (!existing || score > existing.score) {
    const { error } = await supabase
      .from('leaderboard')
      .upsert({ nickname, score }, { onConflict: 'nickname' });
    if (error) {
      console.error('Error upserting leaderboard entry:', error.message);
    }
  }
  fetchLeaderboard();
  setShowLeaderboard(true);
  setTimeout(() => {
    const userEntry = leaderboardRefs.current[nickname];
    if (userEntry) {
      userEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
};

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('leaderboard')
      .select('nickname, score') // Explicitly select only needed columns
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
      setLastIncorrectFact({
        statement: shuffledFacts[currentFactIndex].statement,
        isTrue: shuffledFacts[currentFactIndex].isTrue,
      });
      setGameOver(true);
      fetchLeaderboard();
    }
  }, [currentFactIndex, gameOver, isAnswered, shuffledFacts]);

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
    setLastIncorrectFact(null);
    setNameInput(''); // Reset name input
  }, []);

  const handleCopy = () => {
    const text = lastIncorrectFact
      ? `🤔 Did you know that "${lastIncorrectFact.statement}" was ${lastIncorrectFact.isTrue ? 'true' : 'false'}? I scored ${score} points on FactFrenzy.info! Think you know more facts than me? 🧠`
      : `🎉 I scored ${score} points on FactFrenzy.info! Think you know more facts than me? Try now! 🧠`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const currentFact = shuffledFacts[currentFactIndex];
  if (!currentFact) return null;

  const shareText = lastIncorrectFact
    ? `🤔 Did you know that "${lastIncorrectFact.statement}" was ${lastIncorrectFact.isTrue ? 'true' : 'false'}? I scored ${score} points! Think you know more facts than me? 🧠`
    : `🎉 I scored ${score} points! Think you know more facts than me? Try now! 🧠`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="flex items-center gap-2 text-white hover:text-yellow-300 transition-colors"
          >
            <Crown className="w-6 h-6" />
            <span>Leaderboard</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {showLeaderboard && (
            <div className="lg:col-span-1 bg-white rounded-xl shadow-2xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                Top Players
              </h2>
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.nickname}
                    ref={(el) => (leaderboardRefs.current[entry.nickname] = el)}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span className="font-semibold">#{index + 1} {entry.nickname}</span>
                    <span className="text-indigo-600">{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={resetGame}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Play Again
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className={`bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 ${copySuccess ? 'bg-green-700' : ''}`}
                    >
                      <Share2 className="w-5 h-5" />
                      {copySuccess ? 'Copied!' : 'Share'}
                    </button>

                    <TwitterShareButton
                      url={shareUrl}
                      title={shareText}
                      className="bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-500 transition-colors flex items-center"
                    >
                      <TwitterIcon size={24} round={true} />
                    </TwitterShareButton>

                    <WhatsappShareButton
                      url={shareUrl}
                      title={shareText}
                      separator=" "
                      className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center"
                    >
                      <WhatsappIcon size={24} round={true} />
                    </WhatsappShareButton>

                    <FacebookShareButton
                      url={shareUrl}
                      quote={shareText}
                      className="bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center"
                    >
                      <FacebookIcon size={24} round={true} />
                    </FacebookShareButton>
                  </div>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Enter your name"
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full max-w-xs"
                    />
                    <button
                      onClick={() => updateLeaderboard(nameInput)}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
                    >
                      Add to Leaderboard
                    </button>
                  </div>
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
