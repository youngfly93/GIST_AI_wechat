import requests
from bs4 import BeautifulSoup
import os
import time
from urllib.parse import urljoin

def download_pdfs_from_url(url, base_url, download_folder="downloaded_pdfs"):
    """
    从指定的URL抓取网页，查找所有PDF链接，并下载这些PDF文件。

    Args:
        url (str): 包含PDF链接的网页URL。
        base_url (str): 网站的基础URL，用于解析相对链接。
        download_folder (str): 保存下载文件的文件夹名称。
    """
    print(f"正在访问网页: {url}")

    # 1. 访问网页获取HTML内容
    try:
        # 设置一个简单的User-Agent，模拟浏览器访问
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status() # 检查HTTP请求是否成功

    except requests.exceptions.RequestException as e:
        print(f"访问网页失败: {e}")
        return

    # 2. 解析HTML内容
    soup = BeautifulSoup(response.text, 'html.parser')
    print("网页内容解析成功。")

    # 3. 查找所有以 .pdf 结尾的链接
    pdf_links = set() # 使用set来避免重复链接

    for link in soup.find_all('a', href=True):
        href = link['href']
        # 检查链接是否以 .pdf 结尾（不区分大小写）
        if href.lower().endswith('.pdf'):
            # 将相对链接转换为绝对链接
            full_pdf_url = urljoin(base_url, href)
            pdf_links.add(full_pdf_url)

    print(f"找到 {len(pdf_links)} 个PDF链接。")

    if not pdf_links:
        print("未找到任何PDF链接，退出。")
        return

    # 4. 创建下载文件夹
    if not os.path.exists(download_folder):
        os.makedirs(download_folder)
        print(f"创建下载文件夹: {download_folder}")

    # 5. 下载每个PDF文件
    for pdf_url in pdf_links:
        try:
            print(f"正在下载: {pdf_url}")
            # 获取文件名 (取URL路径的最后一部分)
            filename = os.path.join(download_folder, pdf_url.split('/')[-1])

            # 检查文件是否已存在，如果存在则跳过
            if os.path.exists(filename):
                print(f"文件已存在，跳过下载: {filename}")
                continue

            # 下载文件，使用stream=True处理大文件
            pdf_response = requests.get(pdf_url, stream=True, timeout=10)
            pdf_response.raise_for_status() # 检查HTTP请求是否成功

            with open(filename, 'wb') as f:
                for chunk in pdf_response.iter_content(chunk_size=8192): # 分块写入文件
                    f.write(chunk)

            print(f"下载完成: {filename}")

            # 为了不给服务器造成太大压力，每次下载后暂停一下
            time.sleep(1) # 暂停1秒

        except requests.exceptions.RequestException as e:
            print(f"下载 {pdf_url} 失败: {e}")
        except Exception as e:
            print(f"处理 {pdf_url} 时发生错误: {e}")

# --- 主程序入口 ---
if __name__ == "__main__":
    target_url = "https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1507"
    website_base_url = "https://www.nccn.org" # 网站的基础URL

    download_pdfs_from_url(target_url, website_base_url)
    print("所有任务完成。")
