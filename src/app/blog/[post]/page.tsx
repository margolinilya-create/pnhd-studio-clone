import React from 'react';
import { notFound } from 'next/navigation';
import styles from './page.module.scss';
import classNames from 'classnames/bind';
import Image from 'next/image';
import { getAllPostSlugs, getPostBySlug } from '@/lib/queries/blog';
import {SITE_INFO} from "@/app/constants";
import {Metadata} from "next";

const cx = classNames.bind(styles);

export async function generateMetadata({params}: {
    params: { post: string };
}): Promise<Metadata> {

    return {
        alternates: {
            canonical: SITE_INFO.domain + '/blog/' + params.post,
        },
    }
}

export const generateStaticParams = async () => {
    const slugs = await getAllPostSlugs();
    return slugs.map((slug) => ({ post: slug }));
}
export const dynamicParams = true;

const PostPage = async ({params}: { params: { post: string } }) => {
    const post = await getPostBySlug(params.post);
    if (!post) notFound();

    return (
        <>
            {post &&
                <section className={cx('postPage')}>
                    <div className={cx('postPage__head')}>
                        <div className={cx('postPage__head-block', 'postPage__head-block_left')}>
                            <div className="">
                                <p className={cx('postPage__post-info-text')}># 00{post.post_id}</p>
                                <h1 className={cx('postPage__post-title')}>{post.title}</h1>
                                <p className={cx('postPage__post-subtitle')}>{post.subtitle}</p>
                            </div>
                            <div className="">
                                <p className={cx('postPage__post-info-text')}>{'>> '}</p>
                                <p className={cx('postPage__post-info-text')}>{post.createdAt}</p>
                                <p className={cx('postPage__post-info-text')}>Автор: {post.author}</p>
                                {/* <p className={cx('postPage__post-info-text')}>🖤 {post.likes}</p> */}
                                <p className={cx('postPage__post-info-text')}>{post.hashtags}</p>
                            </div>
                        </div>
                        <div className={cx('postPage__head-block', 'postPage__head-block_right')}>
                            <div>
                                <img src={post.cover} alt='Обложка поста'/>
                            </div>
                        </div>
                    </div>

                    <div className={cx('postPage__main-text-block')} dangerouslySetInnerHTML={post.blog}>
                    </div>
                </section>
            }
        </>
    )
}

export default PostPage;