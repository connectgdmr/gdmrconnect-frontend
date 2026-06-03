import React from "react";

// ─── Daily Motivational Quote ─────────────────────────────────────────────────
const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "What you get by achieving your goals is not as important as what you become.", author: "Henry David Thoreau" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "Your limitation — it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Little things make big days.", author: "Unknown" },
  { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
  { text: "Don't wait for opportunity. Create it.", author: "Unknown" },
  { text: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
  { text: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
  { text: "Dream bigger. Do bigger.", author: "Unknown" },
  { text: "You are stronger than you think.", author: "Unknown" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "Be so good they can't ignore you.", author: "Steve Martin" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Talent wins games, but teamwork wins championships.", author: "Michael Jordan" },
  { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
  { text: "Coming together is a beginning, staying together is progress, working together is success.", author: "Henry Ford" },
  { text: "The strength of the team is each individual member. The strength of each member is the team.", author: "Phil Jackson" },
  { text: "No matter how many mistakes you make or how slow you progress, you are still way ahead of everyone who isn't trying.", author: "Tony Robbins" },
  { text: "Take risks: if you win, you will be happy; if you lose, you will be wise.", author: "Unknown" },
  { text: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon" },
  { text: "Invest in yourself. Your career is the engine of your wealth.", author: "Paul Clitheroe" },
  { text: "Excellence is not a skill. It is an attitude.", author: "Ralph Marston" },
  { text: "The road to success and the road to failure are almost exactly the same.", author: "Colin R. Davis" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.", author: "Steve Jobs" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
  { text: "Too many of us are not living our dreams because we are living our fears.", author: "Les Brown" },
  { text: "Definiteness of purpose is the starting point of all achievement.", author: "W. Clement Stone" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "You become what you believe.", author: "Oprah Winfrey" },
  { text: "The most common way people give up their power is by thinking they don't have any.", author: "Alice Walker" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "Twenty years from now you will be more disappointed by the things that you didn't do than by the ones you did.", author: "Mark Twain" },
  { text: "Life is not measured by the number of breaths we take, but by the moments that take our breath away.", author: "Maya Angelou" },
  { text: "If life were predictable, it would cease to be life and be without flavor.", author: "Eleanor Roosevelt" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
  { text: "If you look at what you have in life, you'll always have more.", author: "Oprah Winfrey" },
  { text: "If you want to live a happy life, tie it to a goal, not to people or things.", author: "Albert Einstein" },
  { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" },
  { text: "Money and success don't change people; they merely amplify what is already there.", author: "Will Smith" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Not how long, but how well you have lived is the main thing.", author: "Seneca" },
  { text: "We must be willing to let go of the life we planned so as to have the life that is waiting for us.", author: "Joseph Campbell" },
  { text: "If you are not willing to risk the usual, you will have to settle for the ordinary.", author: "Jim Rohn" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { text: "You have brains in your head. You have feet in your shoes. You can steer yourself in any direction you choose.", author: "Dr. Seuss" },
  { text: "Speak softly and carry a big stick; you will go far.", author: "Theodore Roosevelt" },
  { text: "Keep your face always toward the sunshine, and shadows will fall behind you.", author: "Walt Whitman" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "I would rather die of passion than of boredom.", author: "Vincent van Gogh" },
  { text: "If opportunity doesn't knock, build a door.", author: "Milton Berle" },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
  { text: "Every child is an artist. The problem is how to remain an artist once we grow up.", author: "Pablo Picasso" },
  { text: "You can never cross the ocean until you have the courage to lose sight of the shore.", author: "Christopher Columbus" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  { text: "The two most important days in your life are the day you are born and the day you find out why.", author: "Mark Twain" },
  { text: "Whatever the mind of man can conceive and believe, it can achieve.", author: "Napoleon Hill" },
  { text: "Eighty percent of success is showing up.", author: "Woody Allen" },
  { text: "I didn't fail the test. I just found 100 ways to do it wrong.", author: "Benjamin Franklin" },
  { text: "In order to succeed, your desire for success should be greater than your fear of failure.", author: "Bill Cosby" },
  { text: "A journey of a thousand miles must begin with a single step.", author: "Lao Tzu" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Things work out best for those who make the best of how things work out.", author: "John Wooden" },
  { text: "To live a creative life, we must lose our fear of being wrong.", author: "Joseph Chilton Pearce" },
  { text: "Trust yourself. You know more than you think you do.", author: "Benjamin Spock" },
  { text: "What's money? A man is a success if he gets up in the morning and goes to bed at night and in between does what he wants to do.", author: "Bob Dylan" },
];

export default function DailyQuote() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const quote = QUOTES[dayOfYear % QUOTES.length];

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%, #f6fbf8 100%)",
      border: "1px solid #bbf7d0",
      borderLeft: "4px solid var(--brand)",
      borderRadius: 12,
      padding: "18px 22px 16px 24px",
      marginBottom: 16,
    }}>
      {/* Decorative large quote mark */}
      <span style={{
        position: "absolute", top: -2, left: 14,
        fontSize: 72, lineHeight: 1, color: "var(--brand)", opacity: 0.10,
        fontFamily: "Georgia, serif", fontWeight: 900, userSelect: "none",
        pointerEvents: "none",
      }}>
        "
      </span>

      <div style={{ position: "relative" }}>
        <div style={{
          fontSize: 13.5, lineHeight: 1.65, color: "#1e293b",
          fontStyle: "italic", fontWeight: 500, marginBottom: 10,
        }}>
          "{quote.text}"
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "inline-block", width: 20, height: 1.5,
            background: "var(--brand)", borderRadius: 2, opacity: 0.6, flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: "0.02em" }}>
            {quote.author}
          </span>
        </div>
      </div>
    </div>
  );
}
