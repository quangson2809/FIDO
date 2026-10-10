import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StorefrontIcon } from '../components/StorefrontIcon';
import { APP_PATHS } from '../routes/paths';
import './about.css';

const values = [
  {
    name: 'FIT',
    icon: 'straighten',
    title: 'Vừa vặn với bạn',
    text: 'Từ phom dáng đến lựa chọn size, sự phù hợp là điểm khởi đầu để bạn tìm thấy trang phục dành cho mình.',
  },
  {
    name: 'INNOVATE',
    icon: 'tune',
    title: 'Rõ ràng trong lựa chọn',
    text: 'Hướng tới một trải nghiệm mua sắm tinh gọn, nơi thông tin sản phẩm và các lựa chọn được trình bày dễ hiểu.',
  },
  {
    name: 'DEVOTE',
    icon: 'favorite',
    title: 'Chỉn chu trong trải nghiệm',
    text: 'Đề cao sự chăm chút trong cách giới thiệu sản phẩm và từng bước khách hàng khám phá FIDO.',
  },
  {
    name: 'OPEN',
    icon: 'open_in_full',
    title: 'Cởi mở với phong cách',
    text: 'Không giới hạn bạn trong một khuôn mẫu. Hãy kết hợp màu sắc và phom dáng theo cách riêng của mình.',
  },
] as const;

const steps = [
  {
    title: 'Khám phá',
    text: 'Tìm kiếm và xem các sản phẩm trong catalog FIDO.',
  },
  {
    title: 'Tìm sự phù hợp',
    text: 'Xem thông tin sản phẩm, chọn size và màu theo biến thể có sẵn.',
  },
  {
    title: 'Hoàn thiện lựa chọn',
    text: 'Đăng nhập để thêm sản phẩm vào giỏ hàng và kiểm tra lựa chọn của bạn.',
  },
  {
    title: 'Đặt hàng',
    text: 'Tiếp tục tới bước đặt hàng và thanh toán COD trong luồng mua sắm hiện có.',
  },
] as const;

// Original local editorial illustrations; these do not depict actual catalog stock.
const Art = ({
  name,
  alt,
  eager = false,
}: {
  name: 'wardrobe' | 'details' | 'palette';
  alt: string;
  eager?: boolean;
}) => {
  const [failed, setFailed] = useState(false);
  const width = name === 'palette' ? 900 : 800;
  const height = name === 'wardrobe' ? 1000 : name === 'palette' ? 650 : 900;
  if (failed)
    return (
      <div
        className="about-art-fallback"
        style={{ aspectRatio: `${width}/${height}` }}
        role="img"
        aria-label={alt}
      >
        <span>FIDO / Tinh thần tối giản</span>
      </div>
    );
  return (
    <img
      src={`/images/about/${name}.svg`}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      width={width}
      height={height}
      onError={() => setFailed(true)}
    />
  );
};

const scrollToTop = () => window.scrollTo(0, 0);

export const AboutScreen = () => (
  <div className="fido-about">
    <section
      className="about-hero about-container"
      aria-labelledby="about-title"
    >
      <div className="about-hero-copy">
        <p className="about-eyebrow">FIDO Fashion / Ready-to-Wear</p>
        <h1 id="about-title">
          FIDO — Thời trang dành cho <em>phong cách của bạn</em>
        </h1>
        <p className="about-intro">
          Tinh thần tối giản. Trang phục có tính ứng dụng. Một không gian để bạn
          khám phá những lựa chọn phù hợp với nhịp sống và cách thể hiện bản
          thân.
        </p>
        <Link
          onClick={scrollToTop}
          className="about-button"
          to={APP_PATHS.catalog}
        >
          Khám phá sản phẩm <span aria-hidden="true">↗</span>
        </Link>
        <p className="about-signature">Fit • Innovate • Devote • Open</p>
      </div>
      <figure className="about-hero-art">
        <Art
          name="wardrobe"
          eager
          alt="Minh họa phối áo khoác xanh, quần màu be và phụ kiện theo tinh thần tối giản"
        />
        <figcaption>Minh họa thời trang / Tinh thần FIDO</figcaption>
      </figure>
    </section>

    <section
      className="about-story about-container"
      aria-labelledby="about-story-title"
    >
      <figure className="about-story-art">
        <Art
          name="details"
          alt="Minh họa chi tiết cổ áo, đường nét và bảng màu xanh, kem, vàng"
        />
        <figcaption>Đường nét giản dị. Lựa chọn có chủ đích.</figcaption>
      </figure>
      <div>
        <p className="about-eyebrow">Về FIDO</p>
        <h2 id="about-story-title">Câu chuyện FIDO</h2>
        <p>
          FIDO Fashion mang tinh thần Ready-to-Wear: trang phục để bạn lựa chọn,
          kết hợp và đưa vào cuộc sống thường ngày.
        </p>
        <p>
          Chúng tôi hướng tới ngôn ngữ thời trang tối giản, hiện đại — để phom
          dáng, màu sắc và cá tính của người mặc có không gian lên tiếng.
        </p>
        <p>
          Bốn từ khóa <strong>Fit, Innovate, Devote, Open</strong> là cách FIDO
          diễn đạt định hướng ấy: phù hợp, đổi mới, chỉn chu và cởi mở. Không
          cần một phong cách cố định, chỉ cần những lựa chọn mang dấu ấn của
          bạn.
        </p>
      </div>
    </section>

    <section className="about-values" aria-labelledby="about-values-title">
      <div className="about-container">
        <p className="about-eyebrow">Tinh thần thương hiệu</p>
        <h2 id="about-values-title">Bốn góc nhìn. Một tinh thần FIDO.</h2>
        <div className="about-values-grid">
          {values.map((value, index) => (
            <article key={value.name}>
              <div className="about-value-mark">
                <StorefrontIcon name={value.icon} />
                <span aria-hidden="true">0{index + 1}</span>
              </div>
              <p className="about-value-name">{value.name}</p>
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section
      className="about-experience about-container"
      aria-labelledby="about-experience-title"
    >
      <div>
        <p className="about-eyebrow">Trải nghiệm mua sắm</p>
        <h2 id="about-experience-title">
          Từ cảm hứng
          <br />
          đến lựa chọn của bạn.
        </h2>
        <p>
          Khám phá theo nhịp của riêng mình, với thông tin sản phẩm và các bước
          mua sắm rõ ràng.
        </p>
        <Link
          onClick={scrollToTop}
          className="about-text-link"
          to={APP_PATHS.catalog}
        >
          Mở catalog <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ol>
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="about-step-number" aria-hidden="true">
              0{index + 1}
            </span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>

    <section
      className="about-editorial about-container"
      aria-labelledby="about-editorial-title"
    >
      <div className="about-editorial-heading">
        <p className="about-eyebrow">FIDO Editorial</p>
        <h2 id="about-editorial-title">
          Ít hơn trong chi tiết.
          <br />
          <em>Nhiều hơn trong cách thể hiện.</em>
        </h2>
      </div>
      <figure>
        <Art
          name="palette"
          alt="Minh họa phối trang phục xanh và trung tính cùng điểm nhấn vàng"
        />
        <figcaption>
          Minh họa phong cách, không phải hình ảnh sản phẩm đang bán.
        </figcaption>
      </figure>
      <p className="about-editorial-note">
        Một bảng màu hài hòa. Một phom dáng bạn yêu thích. Những cách kết hợp
        nhỏ để tạo nên phong cách của riêng bạn.
      </p>
    </section>

    <section className="about-final" aria-labelledby="about-final-title">
      <div className="about-container">
        <p className="about-eyebrow">Phong cách bắt đầu từ lựa chọn</p>
        <h2 id="about-final-title">
          Khám phá FIDO.
          <br />
          Tìm cảm hứng cho mỗi ngày.
        </h2>
        <div className="about-actions">
          <Link
            onClick={scrollToTop}
            className="about-button"
            to={APP_PATHS.catalog}
          >
            Mua sắm ngay <span aria-hidden="true">↗</span>
          </Link>
          <Link
            onClick={scrollToTop}
            className="about-button about-button-secondary"
            to={APP_PATHS.policy}
          >
            Xem chính sách <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  </div>
);
