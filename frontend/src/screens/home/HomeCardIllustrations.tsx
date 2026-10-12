import { resolveCategoryArtwork } from './categoryArtwork';

/**
 * Editorial artwork for homepage navigation and benefit cards.
 * These drawings represent categories and shopping actions, never actual stock.
 */
export type BenefitArtworkKind = 'categories' | 'fit' | 'details' | 'cod';
/** Decorative category thumbnails are selected from the API category name. */
export const CategoryCardIllustration = ({ name }: { name: string }) => {
  const artwork = resolveCategoryArtwork(name);

  return (
    <svg
      viewBox="0 0 260 170"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      data-artwork={artwork}
      className="h-full w-full"
    >
      <circle cx="171" cy="70" r="70" fill="#E8C75B" opacity=".27" />
      <circle cx="55" cy="44" r="37" fill="#E2E8DE" opacity=".75" />
      <ellipse cx="131" cy="154" rx="82" ry="8" fill="#0B2419" opacity=".09" />
      {artwork === 'tops' && (
        <g>
          <path
            d="M87 32 108 23h45l21 9 42 35-26 33-26-19v64H97V81L71 100 45 67Z"
            fill="#1B5038"
            stroke="#0B2419"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M108 23q20 32 45 0l-8-3h-28Z" fill="#F5EFDF" />
          <path d="M130 49v88M98 90h65" stroke="#B6C6AE" strokeWidth="2" opacity=".65" />
          <path d="M70 66 96 87m70 0 25-21" stroke="#B6C6AE" strokeWidth="2" />
        </g>
      )}
      {artwork === 'bottoms' && (
        <g>
          <path
            d="M93 25h75l15 124-38 5-17-79-18 79-39-5Z"
            fill="#B5A58D"
            stroke="#4D5546"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M94 44h74M128 46v29M91 58l19 17m60-17-20 17"
            fill="none"
            stroke="#7A6B58"
            strokeWidth="2.5"
          />
          <path d="M73 147h35m38 0h35" stroke="#7A6B58" strokeWidth="2" />
          <rect x="113" y="28" width="29" height="7" rx="2" fill="#E8C75B" />
        </g>
      )}
      {(artwork === 'dresses' || artwork === 'womenswear') && (
        <g>
          <path
            d="M110 22q20 26 40 0l22 9 24 38-25 16-13-20-5 25 35 61H71l35-61-5-25-13 20-25-16 24-38Z"
            fill="#E6D5BC"
            stroke="#4E5A4A"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M110 22q20 36 40 0M106 88q24 12 47 0"
            fill="none"
            stroke="#947F68"
            strokeWidth="2.5"
          />
          <path
            d="M108 99 88 148m46-48v48m23-49 18 49"
            stroke="#B6A089"
            strokeWidth="2"
            opacity=".75"
          />
          {artwork === 'womenswear' && (
            <circle cx="191" cy="45" r="13" fill="#1B5038" opacity=".75" />
          )}
        </g>
      )}
      {artwork === 'accessories' && (
        <g>
          <path
            d="M81 74h99l14 78H67Z"
            fill="#1B5038"
            stroke="#0B2419"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M101 75V63a30 30 0 0 1 60 0v12" fill="none" stroke="#DCC793" strokeWidth="9" />
          <path d="M80 92h101M101 112h58" stroke="#A6B39D" strokeWidth="2" opacity=".85" />
          <circle cx="130" cy="120" r="9" fill="#E8C75B" />
        </g>
      )}
      {artwork === 'shoes' && (
        <g>
          <path
            d="M40 106q39 3 58-39l29 20q17 18 59 23l31 13v25H43q-13-10-3-42Z"
            fill="#F2E8D8"
            stroke="#0B2419"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M44 136h167M101 87l-13 23m27-13-13 23m27-12-13 22"
            stroke="#A89B89"
            strokeWidth="3"
          />
          <path d="M47 146h163" stroke="#1B5038" strokeWidth="5" />
          <circle cx="179" cy="119" r="7" fill="#E8C75B" />
        </g>
      )}
      {artwork === 'menswear' && (
        <g>
          <path
            d="m81 38 28-18h43l29 18 35 79-27 13-24-43v64H95V87l-24 43-27-13Z"
            fill="#1B5038"
            stroke="#0B2419"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="m108 20 22 42 22-42-11 64-11 14-12-14Z" fill="#F5EFDF" />
          <path
            d="m113 37 17 61-24-23m41-38-17 61 24-23"
            fill="none"
            stroke="#72917D"
            strokeWidth="2"
          />
          <circle cx="130" cy="110" r="3.5" fill="#E8C75B" />
          <circle cx="130" cy="126" r="3.5" fill="#E8C75B" />
        </g>
      )}
      {artwork === 'essentials' && (
        <g>
          <rect
            x="66"
            y="107"
            width="128"
            height="42"
            rx="7"
            fill="#A4B6A6"
            stroke="#566D5A"
            strokeWidth="2.5"
          />
          <path
            d="M82 90h96q12 0 12 12v13H70v-13q0-12 12-12Z"
            fill="#F0E0C3"
            stroke="#9E917E"
            strokeWidth="2"
          />
          <path
            d="M90 56h79l18 16-16 22H88L72 72Z"
            fill="#1B5038"
            stroke="#0B2419"
            strokeWidth="2.5"
          />
          <path d="M93 72h74m-74 43h75m-75 17h48" stroke="#D8CEB8" strokeWidth="2" opacity=".85" />
        </g>
      )}
    </svg>
  );
};

/** Compact narrative illustrations for four independently labelled benefit cards. */
export const BenefitCardIllustration = ({ kind }: { kind: BenefitArtworkKind }) => (
  <svg
    viewBox="0 0 260 126"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    data-benefit-artwork={kind}
    className="h-full w-full"
  >
    <circle cx="203" cy="50" r="63" fill="#E8C75B" opacity=".22" />
    <ellipse cx="131" cy="116" rx="101" ry="6" fill="#0B2419" opacity=".08" />
    {kind === 'categories' && (
      <g>
        <rect x="36" y="22" width="57" height="80" rx="5" fill="#E4ECE2" stroke="#A5B7A5" />
        <rect x="102" y="12" width="57" height="90" rx="5" fill="#FFFCF5" stroke="#A5B7A5" />
        <rect x="168" y="28" width="57" height="74" rx="5" fill="#F7EBCB" stroke="#D4C294" />
        <path d="M55 41 64 35h6l9 6 7 15-9 6-4-8v33H57V54l-4 8-9-6Z" fill="#1B5038" />
        <path d="M119 31h25l5 53-12 2-5-37-5 37-13-2Z" fill="#B5A58D" />
        <path
          d="M182 58h29l6 32h-41Zm5 0v-8a10 10 0 0 1 20 0v8"
          fill="#1B5038"
          stroke="#1B5038"
          strokeWidth="2"
        />
        <path d="M47 95h35m29 0h42m24 0h39" stroke="#9DA99C" strokeWidth="2" />
      </g>
    )}
    {kind === 'fit' && (
      <g>
        <rect x="33" y="20" width="31" height="83" rx="5" fill="#E8C75B" stroke="#B89E55" />
        <path
          d="M42 31h10m-10 12h16m-16 12h10m-10 12h16m-16 12h10m-10 12h16"
          stroke="#5F5636"
          strokeWidth="2"
        />
        <path
          d="m114 32 18-9h30l18 9 24 28-17 20-16-12v34h-50V68l-16 12-17-20Z"
          fill="#1B5038"
          stroke="#0B2419"
          strokeWidth="2"
        />
        <path d="M132 23q15 21 30 0" stroke="#F1E8CF" strokeWidth="5" fill="none" />
        <circle cx="214" cy="80" r="12" fill="#E8C75B" stroke="#D0AD4B" />
        <circle cx="214" cy="52" r="12" fill="#B6C8B7" stroke="#839B83" />
      </g>
    )}
    {kind === 'details' && (
      <g>
        <rect
          x="57"
          y="18"
          width="102"
          height="91"
          rx="6"
          fill="#FFFDF5"
          stroke="#8C9B88"
          strokeWidth="2"
        />
        <path
          d="M77 39h60M77 51h47M77 62h60M77 73h33"
          stroke="#AEB8A7"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="m160 29 20 12-19 34-21-12Z" fill="#1B5038" stroke="#0B2419" strokeWidth="2" />
        <circle cx="161" cy="42" r="4" fill="#E8C75B" />
        <circle cx="185" cy="86" r="23" fill="#E8C75B" stroke="#0B2419" strokeWidth="2" />
        <path
          d="m174 86 8 8 15-17"
          fill="none"
          stroke="#0B2419"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    )}
    {kind === 'cod' && (
      <g>
        <path d="M43 43h94v62H43Z" fill="#C9BA9F" stroke="#8F7E64" strokeWidth="2.5" />
        <path d="M43 43 90 24l47 19-47 18Z" fill="#E2D5C1" stroke="#8F7E64" strokeWidth="2" />
        <path d="M90 61v44m-17-74 47 19" stroke="#9C876D" strokeWidth="2" />
        <rect
          x="142"
          y="62"
          width="80"
          height="43"
          rx="5"
          fill="#E8C75B"
          stroke="#A58C40"
          strokeWidth="2.5"
        />
        <circle cx="181" cy="83" r="13" fill="none" stroke="#1B5038" strokeWidth="2.5" />
        <path d="M151 72h8m46 23h8" stroke="#1B5038" strokeWidth="2.5" />
        <path
          d="m157 39 12-11 12 11"
          fill="none"
          stroke="#1B5038"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M169 28v29" stroke="#1B5038" strokeWidth="2.5" />
      </g>
    )}
  </svg>
);
