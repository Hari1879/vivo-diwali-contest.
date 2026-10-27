/**
 * Everything vivo will hand over, in one place.
 *  - Replace public/assets/banner.svg with vivo's creative (1080 x 600 px, JPG/PNG/WebP, < 300 KB)
 *    and update BANNER_URL if the file name changes.
 *  - Paste the final Terms & Conditions into TERMS_HTML.
 */
export const BANNER_URL = '/assets/banner.svg';

export const SCRATCH_MESSAGE = {
  title: 'Happy Diwali!',
  body: 'May this festival of lights bring joy and prosperity to you and your family.',
};

export const TERMS_HTML = `
  <p><strong>Terms &amp; Conditions – to be provided by vivo.</strong></p>
  <ol>
    <li>The contest is open only to customers who purchase a vivo smartphone priced at Rs. 20,000 and above during the contest period at participating stores in Tamil Nadu and Pondicherry.</li>
    <li>Only one entry is allowed per IMEI number.</li>
    <li>Gifts are allocated by vivo. The scratch card is for engagement only and does not indicate a gift.</li>
    <li>Participants agree that vivo may contact them on the numbers provided regarding this contest.</li>
    <li>vivo's decision on all matters related to the contest is final.</li>
  </ol>
`;
