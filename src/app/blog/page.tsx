import React from 'react';
import styles from './page.module.scss';
import classnames from 'classnames/bind';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts } from '@/lib/queries/blog';
import {Metadata} from 'next';
import button_arrow_right from "../../../public/button_arrow_right.svg";
import ArticleTagButton from "@/components/pages-components/blog/article-tag/article-tag";
import {SITE_INFO} from "@/app/constants";
import { buildMetadata } from "@/app/_lib/build-metadata";

const cx = classnames.bind(styles);

export async function generateMetadata(): Promise<Metadata> {
    return {
        ...buildMetadata({
            title: `Пошив и печать на одежде — статьи от ${SITE_INFO.name} для бизнеса и клиентов`,
            description: `${SITE_INFO.name} — блог о создании мерча. Отвечаем на важные вопросы о пошиве одежды и нанесении принтов: как выбрать ткань, технологию печати, рассчитать бюджет. Помогаем заказчикам принимать взвешенные решения.`,
            path: '/blog',
        }),
        keywords: ['Печать на текстиле', 'Мерч', 'Блог о печати на одежде'],
    };
}


const Blog = async () => {
    let {posts} = await getAllPosts();
    posts = posts.slice().sort((a, b) => (b.post_id - a.post_id))

    let postTags: Array<string> = [];
    let txtThumbToPost: Array<string> = [];
    if (posts && posts.length > 0) {
        for (let postIndex in posts) {
            let post = posts[postIndex]
            let textContent = post.blog.__html
                .replace(/<[^>]*>/g, '')
                .slice(0, 110)
                .replace(/[,:;\s]$/, '') + '...';
            txtThumbToPost[postIndex] = textContent
            if (!post['hashtags'] || post['hashtags'].length < 1) {
                continue;
            }
            for (let tag of post['hashtags']) {
                postTags.push(tag)
            }
        }
    }

    const h1: string = 'Блог';

    let tagList = [
        'Пошив', 'печать', 'вышивка', 'бланк', 'мерч', 'маркетинг'
    ];

    return (
        <>
            {posts && posts.length > 0 &&
                <section className={cx('blogPage')}>
                    <div className="breadcrumbs">
                        <a className={'breadcrumb-item'} href="/">Главная</a>
                        <span className={'breadcrumb-item'}>{h1}</span>
                    </div>
                    <h1 className={cx('blogPage__title')}>{h1}</h1>
                    <div className={cx('articles-tag-list')}>
                        {tagList.map((item, index) => (
                            <ArticleTagButton key={index} tag={item}/>
                        ))}
                    </div>
                    <div className={cx('blogPage__posts')}>
                        {posts.map((post, index) => (
                            <Link href={`/blog/${post.slug}`} className={cx('blogPage__card')} key={post.post_id}>
                                <div className={cx('blogPage__card-wrapper')}>
                                    <img src={post.cover} alt='Обложка поста' className={cx('blogPage__card-cover')}/>
                                    <div className={cx('blogPage__card-title-wrapper')}>
                                        <div className={cx('blogPage__card-subtext')}>
                                            <div className={cx('blogPage__card-tag-list')}>
                                                <div className={cx('blogPage__card-tag')}>Пошив</div>
                                            </div>
                                            <div className={cx('blogPage__card-plain-text')}>{post.createdAt}</div>
                                        </div>
                                        <h2 className={cx('blogPage__card-title')}>{post.title}</h2>
                                        <div className={cx('blogPage__card-txt')}>{txtThumbToPost[index]}</div>
                                        {false && <div className={cx('blogPage__card-subtext')}>
                                            <div className={cx('blogPage__hashtags-wrapper')}>
                                                {post.hashtags.map((tag, index) => (
                                                    <div className={cx('blogPage__card-plain-text')} key={index}>{tag}</div>
                                                ))}
                                            </div>
                                            {/* <p className={cx('blogPage__card-plain-text')}>🖤 {post.likes}</p> */}
                                        </div>}
                                        <button type="button" className={cx('blogPage__card-more')}>
                                            <Image src={button_arrow_right} alt="стрелка вправо"/>
                                        </button>
                                    </div>

                                </div>
                            </Link>)
                        )}
                    </div>
                </section>
            }
        </>
    )
}

export default Blog;
