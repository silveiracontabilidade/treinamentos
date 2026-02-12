from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Departamento, Treinamento, Modulo


class Command(BaseCommand):
    help = "Seed inicial de departamentos, treinamentos e modulos"

    def handle(self, *args, **options):
        dep_fiscal, _ = Departamento.objects.get_or_create(nome="Departamento Fiscal")
        dep_contabil, _ = Departamento.objects.get_or_create(nome="Departamento Contabil")

        tr1, _ = Treinamento.objects.get_or_create(
            codigo="FISC-001",
            nome="Rotinas de Apuracao",
            responsavel="Carla Andrade",
            departamento=dep_fiscal,
        )

        tr2, _ = Treinamento.objects.get_or_create(
            codigo="CONT-014",
            nome="Fechamento Mensal",
            responsavel="Rafael Lopes",
            departamento=dep_contabil,
        )

        Modulo.objects.get_or_create(
            treinamento=tr1,
            titulo="Introducao ao fluxo fiscal",
            defaults={
                "descricao": "Visao geral das etapas, prazos e pontos criticos da rotina fiscal.",
                "video_iframe": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                "video_origem": "youtube",
            },
        )

        Modulo.objects.get_or_create(
            treinamento=tr1,
            titulo="Checklist de conferencia",
            defaults={
                "descricao": "Checklist detalhado para garantir conferencias e validacoes.",
                "video_iframe": "https://www.youtube.com/embed/oHg5SJYRHA0",
                "video_origem": "youtube",
            },
        )

        Modulo.objects.get_or_create(
            treinamento=tr2,
            titulo="Planejamento do fechamento",
            defaults={
                "descricao": "Como organizar prazos, times e entregas para o fechamento.",
                "video_iframe": "https://www.youtube.com/embed/aqz-KE-bpKQ",
                "video_origem": "youtube",
            },
        )

        Modulo.objects.get_or_create(
            treinamento=tr2,
            titulo="Validacoes finais",
            defaults={
                "descricao": "Pontos de atencao e validacoes finais com o cliente.",
                "video_iframe": "https://www.youtube.com/embed/ysz5S6PUM-U",
                "video_origem": "youtube",
            },
        )

        Modulo.objects.get_or_create(
            treinamento=tr2,
            titulo="Comunicacao com o cliente",
            defaults={
                "descricao": "Modelos de comunicacao e padroes de retorno ao cliente.",
                "video_iframe": "https://www.youtube.com/embed/3JZ_D3ELwOQ",
                "video_origem": "youtube",
            },
        )

        self.stdout.write(self.style.SUCCESS("Seed de treinamentos finalizado."))

        user_model = get_user_model()
        admin_email = "admin@silveira.com.br"
        admin_username = "admin"
        admin_password = "Admin@123"

        if not user_model.objects.filter(username=admin_username).exists():
            user_model.objects.create_superuser(
                username=admin_username,
                email=admin_email,
                password=admin_password,
            )
            self.stdout.write(self.style.SUCCESS("Usuario admin criado: admin / Admin@123"))
