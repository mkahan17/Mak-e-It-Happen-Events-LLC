// Client portal settings. Fill in the two Supabase values to switch from sample data to real logins.
window.PORTAL_CONFIG = {
  // Supabase → Project Settings → API. The "anon public" key is meant to be public; never put the service_role key here.
  SUPABASE_URL: 'https://eiyqqnrpntcsengursdn.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpeXFxbnJwbnRjc2VuZ3Vyc2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzM2MTksImV4cCI6MjEwODk0OTYxOX0.tkM76gTeBUq8sPvk43RFBFrvHMMv0Xtxd06N3f7UwX8',

  BUSINESS: 'MAK(e) It Happen Moments',
  PHONE: '817-458-8699',
  EMAIL: 'makeithappenevents.dfw@gmail.com',

  // How clients pay you. Leave a value blank to hide that option.
  // Blank until the LLC's business bank account and Venmo are set up (after the EIN arrives).
  ZELLE: '',
  VENMO: '',
  CHECK_PAYABLE: '',

  // "Book a call" button. Swap in your Google booking page link when it's ready.
  BOOK_CALL_URL: 'sms:+18174588699?&body=Hi%20Mak!%20Can%20we%20set%20up%20a%20quick%20call%3F',
  SITE_URL: 'https://mkahan17.github.io/Mak-e-It-Happen-Events-LLC/',
  REVIEW_URL: 'https://g.page/r/CY07g4Axvu8hEBM/review',  // Google Business review page
  TOOLKIT_URL: 'https://claude.ai/artifact/MoGf8GU53ZkJKmgojBSJri',
};
