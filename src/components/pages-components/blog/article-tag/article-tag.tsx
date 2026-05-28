'use client';

import { useState } from 'react';
import classnames from 'classnames/bind';
import styles from "@/app/(storefront)/blog/page.module.scss";
const cx = classnames.bind(styles);

type Props = {
    tag: string;
};
export default function ArticleTagButton({tag}: Props) {
    let [active, setActive] = useState(false);
    function filterPostsByTag(){
        setActive(prev => !prev)
    }

    return (
        <button className={cx('article-tag', { active })} onClick={filterPostsByTag}>{tag}</button>
    );
}