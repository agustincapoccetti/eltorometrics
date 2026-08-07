# Rugby Pulse

Build a full-stack sports performance monitoring web app for a RUGBY club (colors: black and white only). The app has two roles: athlete and coach.

Authentication: Email + password login. Each athlete has a profile with their name and position.

Athlete view — Two weekly forms:

RPE Form (post-training): A single question — "How hard was today's session?" — rated on a scale from 0 to 10, with descriptive labels (0 = Rest, 5 = Hard, 10 = Maximal). Include a date/session field.

Wellness Form (every morning): Five questions, each rated 1–5:

Sleep quality (1 = Very poor, 5 = Excellent)

Stress level (1 = Very high, 5 = Very low)

Muscle fatigue (1 = Very fatigued, 5 = Fresh)

Mood (1 = Very bad, 5 = Excellent)

Pain/injury: Yes/No toggle. If Yes, open text field to specify location and description.

Coach dashboard:

See all athletes and their form submission status for the current week (submitted / pending)

View individual athlete history (charts over time for RPE and each wellness metric)

Export data to CSV: filterable by athlete, form type (RPE or Wellness), and date range

A reminder code generator: produce a WhatsApp-ready message or copyable text that the coach can send after each session reminding athletes to fill the form, with a direct link to the form

Design: Strictly black and white. Clean, minimal, mobile-first (athletes will use phones). Bold typography. No colors except black, white, and light grey for cards/borders.

Use Supabase for auth and database. Make the app fully functional, not a mockup.

Build a full-stack sports performance monitoring web app for a RUGBY CLUB . The entire app interface must be in Spanish. Colors: black and white only.

The app has two roles: atleta and preparador físico.

Registro y perfil del atleta:

During sign-up, athletes must complete:

Full name and position

Email and password

Weight (kg) and height (cm) — stored and used to calculate BMI

Once per month, the app must prompt the athlete to update their weight. Show a banner or modal when they log in if 30 days have passed since their last weight entry. Store weight history over time so the coach can see evolution.

Remember to also complete a first-time user registration where you can log in as an athlete or coach. And after logging in as a coach, you'll have access to an interface where you can view your athletes' results and ratings, both on the Rating of Perceived Exertion scale and in the wellness forms. Don't forget that in the athlete profile, you can enter your weight and height, set monthly reminders to update your weights, and track your athletes' weight progress.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://eltorometrics.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a385f13f-d806-4f75-abaf-cdd13fc37c41).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
