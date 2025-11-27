/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // tailwindcss ではなく @tailwindcss/postcss を指定するのが v4 の鉄則
    '@tailwindcss/postcss': {},
  },
};

export default config;